package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.domain.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Examen Técnico Virtual — V34.
 * Separación clara: banco (AREA_SOLICITANTE) → config (ORH) → instancia (POSTULANTE) → calificación (SISTEMA).
 * Coexiste con E26 manual: solo actúa si Convocatoria.examenVirtualHabilitado = true.
 */
@Service
public class ExamenVirtualService {

    private final IBancoPreguntaRepository bancoRepo;
    private final IConfigExamenRepository configRepo;
    private final IExamenPostulanteRepository examenRepo;
    private final IRespuestaExamenRepository respuestaRepo;
    private final IConvocatoriaRepository convRepo;
    private final IPostulacionRepository postRepo;
    private final IFactorEvaluacionRepository factorRepo;
    private final ICronogramaRepository cronoRepo;
    private final IAuditPort audit;
    private final NotificacionService notificacionService;

    public ExamenVirtualService(IBancoPreguntaRepository br, IConfigExamenRepository cr,
                                IExamenPostulanteRepository er, IRespuestaExamenRepository rr,
                                IConvocatoriaRepository cvr, IPostulacionRepository pr,
                                IFactorEvaluacionRepository fr, ICronogramaRepository crono,
                                IAuditPort a,
                                NotificacionService ns) {
        this.bancoRepo = br; this.configRepo = cr; this.examenRepo = er;
        this.respuestaRepo = rr; this.convRepo = cvr; this.postRepo = pr;
        this.factorRepo = fr; this.cronoRepo = crono; this.audit = a; this.notificacionService = ns;
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }

    private Convocatoria findConv(Long id) {
        return convRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Convocatoria", id));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. BANCO DE PREGUNTAS — AREA_SOLICITANTE
    // ═══════════════════════════════════════════════════════════════════════

    /** Carga banco de preguntas. Reemplaza el banco anterior si existe. */
    @Transactional
    public BancoPreguntaEstadoResponse cargarBanco(Long idConv, BancoPreguntaRequest req, HttpServletRequest http) {
        Convocatoria conv = findConv(idConv);
        if (!Boolean.TRUE.equals(conv.getExamenVirtualHabilitado())) {
            throw new DomainException("El examen virtual no está habilitado para esta convocatoria.");
        }

        // Validar que el examen no esté ya PUBLICADO o CERRADO
        configRepo.findByConvocatoriaId(idConv).ifPresent(cfg -> {
            if (!"CONFIGURADO".equals(cfg.getEstado())) {
                throw new DomainException("No se puede modificar el banco: el examen ya fue " + cfg.getEstado());
            }
        });

        // Reemplazar banco anterior
        bancoRepo.deleteByConvocatoriaId(idConv);

        List<BancoPregunta> preguntas = new ArrayList<>();
        int num = 1;
        for (BancoPreguntaRequest.PreguntaItem item : req.getPreguntas()) {
            preguntas.add(BancoPregunta.builder()
                    .convocatoria(conv)
                    .numeroPregunta(num++)
                    .enunciado(item.getEnunciado())
                    .opcionA(item.getOpcionA())
                    .opcionB(item.getOpcionB())
                    .opcionC(item.getOpcionC())
                    .opcionD(item.getOpcionD())
                    .respuestaCorrecta(item.getRespuestaCorrecta())
                    .puntaje(item.getPuntaje() != null ? item.getPuntaje() : new BigDecimal("1.00"))
                    .usuarioCreacion(user())
                    .build());
        }
        bancoRepo.saveAll(preguntas);

        audit.registrar("BANCO_PREGUNTA", idConv, "CARGAR_BANCO", null,
                preguntas.size() + " preguntas", http, null);

        BancoPreguntaEstadoResponse.BancoPreguntaEstadoResponseBuilder rb =
                BancoPreguntaEstadoResponse.builder()
                .idConvocatoria(idConv)
                .totalPreguntas(preguntas.size())
                .cargado(true)
                .usuarioCarga(user())
                .fechaCarga(LocalDateTime.now().toString())
                .mensaje("Banco de " + preguntas.size() + " preguntas cargado correctamente.");
        applyTecnicaCronogramaMeta(rb, idConv);
        return rb.build();
    }

    /** Estado del banco — visible para ORH (sin contenido). */
    @Transactional(readOnly = true)
    public BancoPreguntaEstadoResponse estadoBanco(Long idConv) {
        findConv(idConv);
        long total = bancoRepo.countByConvocatoriaId(idConv);
        List<BancoPregunta> lista = total > 0 ? bancoRepo.findByConvocatoriaId(idConv) : List.of();
        String usuario = lista.isEmpty() ? null : lista.get(0).getUsuarioCreacion();
        String fecha = lista.isEmpty() ? null : lista.get(0).getFechaCreacion() != null
                ? lista.get(0).getFechaCreacion().toString() : null;

        BancoPreguntaEstadoResponse.BancoPreguntaEstadoResponseBuilder rb =
                BancoPreguntaEstadoResponse.builder()
                .idConvocatoria(idConv)
                .totalPreguntas(total)
                .cargado(total > 0)
                .usuarioCarga(usuario)
                .fechaCarga(fecha)
                .mensaje(total > 0 ? "Banco cargado con " + total + " preguntas." : "Banco vacío.");
        applyTecnicaCronogramaMeta(rb, idConv);
        return rb.build();
    }

    /** Contenido completo del banco — solo AREA_SOLICITANTE y ADMIN. Retorna las preguntas con respuesta. */
    @Transactional(readOnly = true)
    public List<BancoPregunta> obtenerBancoCompleto(Long idConv) {
        findConv(idConv);
        return bancoRepo.findByConvocatoriaId(idConv);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. CONFIGURACIÓN DEL EXAMEN — ORH
    // ═══════════════════════════════════════════════════════════════════════

    /** Crear o actualizar configuración del examen. */
    @Transactional
    public ConfigExamenResponse configurarExamen(Long idConv, ConfigExamenRequest req, HttpServletRequest http) {
        Convocatoria conv = findConv(idConv);
        if (!Boolean.TRUE.equals(conv.getExamenVirtualHabilitado())) {
            throw new DomainException("El examen virtual no está habilitado para esta convocatoria.");
        }

        long totalBanco = bancoRepo.countByConvocatoriaId(idConv);
        if (totalBanco == 0) {
            throw new DomainException("Debe cargar el banco de preguntas antes de configurar el examen.");
        }

        int cantPreg = req.getCantidadPreguntas() != null ? req.getCantidadPreguntas() : 10;
        if (cantPreg > totalBanco) {
            throw new DomainException("La cantidad de preguntas (" + cantPreg
                    + ") excede el banco disponible (" + totalBanco + ").");
        }

        validarExamenConfiguracion(idConv, cantPreg, req.getFechaHoraInicio(), req.getFechaHoraFin());

        ConfigExamen cfg = configRepo.findByConvocatoriaId(idConv).orElse(
                ConfigExamen.builder().convocatoria(conv).usuarioCreacion(user()).build());

        if (!"CONFIGURADO".equals(cfg.getEstado()) && cfg.getIdConfigExamen() != null) {
            throw new DomainException("El examen ya fue " + cfg.getEstado() + ". No se puede reconfigurar.");
        }

        cfg.setCantidadPreguntas(cantPreg);
        cfg.setFechaHoraInicio(req.getFechaHoraInicio());
        cfg.setFechaHoraFin(req.getFechaHoraFin());
        cfg.setDuracionMinutos(duracionMinutosDesdeVentana(req.getFechaHoraInicio(), req.getFechaHoraFin()));
        // Política producto: el postulante siempre ve su resultado al finalizar (campo API ignorado).
        cfg.setMostrarResultado(true);
        cfg.setUsuarioModificacion(user());
        configRepo.save(cfg);

        audit.registrar("CONFIG_EXAMEN", idConv, "CONFIGURAR_EXAMEN", null, cfg.getEstado(), http, null);

        return mapConfigResponse(cfg, totalBanco, "Examen configurado correctamente.");
    }

    /** Obtener configuración actual. */
    @Transactional(readOnly = true)
    public ConfigExamenResponse obtenerConfig(Long idConv) {
        findConv(idConv);
        long totalBanco = bancoRepo.countByConvocatoriaId(idConv);
        ConfigExamen cfg = configRepo.findByConvocatoriaId(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Configuración examen virtual (convocatoria)", idConv));
        return mapConfigResponse(cfg, totalBanco, null);
    }

    /** Publicar examen — cambia estado a PUBLICADO. Prerequisito para que postulantes lo vean. */
    @Transactional
    public ConfigExamenResponse publicarExamen(Long idConv, HttpServletRequest http) {
        Convocatoria conv = findConv(idConv);
        ConfigExamen cfg = configRepo.findByConvocatoriaId(idConv)
                .orElseThrow(() -> new DomainException("Configure el examen antes de publicar."));

        if (!"CONFIGURADO".equals(cfg.getEstado())) {
            throw new DomainException("El examen ya fue " + cfg.getEstado() + ".");
        }

        long totalBanco = bancoRepo.countByConvocatoriaId(idConv);
        if (totalBanco < cfg.getCantidadPreguntas()) {
            throw new DomainException("El banco tiene " + totalBanco
                    + " preguntas pero el examen requiere " + cfg.getCantidadPreguntas() + ".");
        }

        validarExamenConfiguracion(idConv, cfg.getCantidadPreguntas(),
                cfg.getFechaHoraInicio(), cfg.getFechaHoraFin());

        cfg.setEstado("PUBLICADO");
        cfg.setUsuarioModificacion(user());
        configRepo.save(cfg);

        audit.registrar("CONFIG_EXAMEN", idConv, "PUBLICAR_EXAMEN", "CONFIGURADO", "PUBLICADO", http, null);

        return mapConfigResponse(cfg, totalBanco, "Examen publicado. Los postulantes podrán verlo en el horario configurado.");
    }

    /** Notificar a postulantes APTO por correo sobre el examen virtual. */
    @Transactional
    public ConfigExamenResponse notificarPostulantes(Long idConv, HttpServletRequest http) {
        Convocatoria conv = findConv(idConv);
        ConfigExamen cfg = configRepo.findByConvocatoriaId(idConv)
                .orElseThrow(() -> new DomainException("Configure y publique el examen antes de notificar."));

        if (!"PUBLICADO".equals(cfg.getEstado())) {
            throw new DomainException("El examen debe estar PUBLICADO para notificar. Estado actual: " + cfg.getEstado());
        }

        List<Postulacion> aptos = postRepo.findByConvocatoriaIdAndEstadoIn(idConv, List.of("APTO"));
        if (aptos.isEmpty()) {
            throw new DomainException("No hay postulantes APTO para notificar.");
        }

        // Encolar notificaciones
        String asunto = "Examen Técnico Virtual — " + conv.getNumeroConvocatoria();
        String contenido = "Se le informa que el examen técnico virtual para la convocatoria "
                + conv.getNumeroConvocatoria() + " está programado para el "
                + cfg.getFechaHoraInicio().toLocalDate() + " de "
                + cfg.getFechaHoraInicio().toLocalTime() + " a "
                + cfg.getFechaHoraFin().toLocalTime()
                + ". Ingrese a 'Mis Postulaciones' para rendirlo.";
        for (Postulacion p : aptos) {
            if (p.getPostulante() != null && p.getPostulante().getUsuario() != null) {
                notificacionService.notificarUsuario(
                        p.getPostulante().getUsuario().getIdUsuario(),
                        conv, asunto, contenido, user());
            }
        }

        cfg.setNotificacionEnviada(true);
        cfg.setCantPostulantesNotificados(aptos.size());
        cfg.setUsuarioModificacion(user());
        configRepo.save(cfg);

        audit.registrar("CONFIG_EXAMEN", idConv, "NOTIFICAR_EXAMEN",
                "false", "true — " + aptos.size() + " postulantes", http, null);

        long totalBanco = bancoRepo.countByConvocatoriaId(idConv);
        return mapConfigResponse(cfg, totalBanco,
                "Notificación enviada a " + aptos.size() + " postulante(s).");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. INSTANCIA DEL EXAMEN — POSTULANTE
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Postulante inicia o reanuda su examen.
     * - Si no tiene instancia: crea una con preguntas aleatorias del banco.
     * - Si ya tiene EN_CURSO: reanuda con las mismas preguntas.
     * - Si ya FINALIZADO/EXPIRADO: retorna resultado sin preguntas.
     * - Valida ventana horaria.
     */
    @Transactional
    public ExamenPostulanteResponse iniciarExamen(Long idConv, Long idPostulacion, HttpServletRequest http) {
        ConfigExamen cfg = configRepo.findByConvocatoriaId(idConv)
                .orElseThrow(() -> new DomainException("No hay examen configurado para esta convocatoria."));

        if (!"PUBLICADO".equals(cfg.getEstado())) {
            throw new DomainException("El examen aún no está disponible. Estado: " + cfg.getEstado());
        }

        LocalDateTime ahora = LocalDateTime.now();

        // Validar ventana horaria
        if (ahora.isBefore(cfg.getFechaHoraInicio())) {
            long minutosParaInicio = ChronoUnit.MINUTES.between(ahora, cfg.getFechaHoraInicio());
            throw new DomainException("El examen aún no ha comenzado. Faltan "
                    + minutosParaInicio + " minutos para la apertura.");
        }
        if (ahora.isAfter(cfg.getFechaHoraFin())) {
            throw new DomainException("La ventana del examen ha cerrado.");
        }

        Postulacion post = postRepo.findById(idPostulacion)
                .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPostulacion));

        // Verificar que la postulación pertenece a la convocatoria
        if (!post.getConvocatoria().getIdConvocatoria().equals(idConv)) {
            throw new DomainException("La postulación no pertenece a esta convocatoria.");
        }
        // Solo APTO puede rendir
        if (!"APTO".equals(post.getEstado())) {
            throw new DomainException("Solo postulantes con estado APTO pueden rendir el examen.");
        }

        // Buscar instancia existente
        Optional<ExamenPostulante> existente =
                examenRepo.findByConfigExamenIdAndPostulacionId(cfg.getIdConfigExamen(), idPostulacion);

        if (existente.isPresent()) {
            ExamenPostulante ep = existente.get();
            if ("FINALIZADO".equals(ep.getEstado()) || "EXPIRADO".equals(ep.getEstado())) {
                return buildResultadoResponse(ep, cfg);
            }
            // EN_CURSO o PENDIENTE — reanuda
            if ("PENDIENTE".equals(ep.getEstado())) {
                ep.setEstado("EN_CURSO");
                ep.setHoraInicio(ahora);
                ep.setIpAcceso(http.getRemoteAddr());
                ep.setUserAgent(http.getHeader("User-Agent"));
                examenRepo.save(ep);
            }
            return buildExamenEnCurso(ep, cfg);
        }

        // Crear nueva instancia
        ExamenPostulante ep = ExamenPostulante.builder()
                .configExamen(cfg)
                .postulacion(post)
                .horaInicio(ahora)
                .estado("EN_CURSO")
                .totalPreguntas(cfg.getCantidadPreguntas())
                .ipAcceso(http.getRemoteAddr())
                .userAgent(http.getHeader("User-Agent"))
                .build();
        examenRepo.save(ep);

        // Seleccionar preguntas aleatorias del banco
        List<BancoPregunta> banco = bancoRepo.findByConvocatoriaId(idConv);
        Collections.shuffle(banco);
        List<BancoPregunta> seleccionadas = banco.subList(0,
                Math.min(cfg.getCantidadPreguntas(), banco.size()));

        // Crear placeholders de respuesta (orden aleatorio ya aplicado)
        List<RespuestaExamen> respuestas = new ArrayList<>();
        int orden = 1;
        for (BancoPregunta preg : seleccionadas) {
            respuestas.add(RespuestaExamen.builder()
                    .examenPostulante(ep)
                    .pregunta(preg)
                    .ordenMostrado(orden++)
                    .puntajeObtenido(BigDecimal.ZERO)
                    .build());
        }
        respuestaRepo.saveAll(respuestas);

        audit.registrar("EXAMEN_POSTULANTE", ep.getIdExamenPostulante(),
                "INICIAR_EXAMEN", null, "EN_CURSO", http, null);

        return buildExamenEnCurso(ep, cfg);
    }

    /**
     * Postulante envía respuestas. Auto-califica y registra resultado.
     * También se invoca al cierre automático de ventana.
     */
    @Transactional
    public ExamenPostulanteResponse responderExamen(Long idConv, Long idPostulacion,
                                                     ResponderExamenRequest req, HttpServletRequest http) {
        ConfigExamen cfg = configRepo.findByConvocatoriaId(idConv)
                .orElseThrow(() -> new DomainException("No hay examen configurado."));

        ExamenPostulante ep = examenRepo.findByConfigExamenIdAndPostulacionId(
                        cfg.getIdConfigExamen(), idPostulacion)
                .orElseThrow(() -> new DomainException("No tiene un examen iniciado."));

        if ("FINALIZADO".equals(ep.getEstado()) || "EXPIRADO".equals(ep.getEstado())) {
            return buildResultadoResponse(ep, cfg);
        }

        LocalDateTime ahora = LocalDateTime.now();
        boolean expirado = ahora.isAfter(cfg.getFechaHoraFin());

        // Registrar respuestas
        List<RespuestaExamen> respuestasExistentes = respuestaRepo.findByExamenPostulanteId(ep.getIdExamenPostulante());
        Map<Long, RespuestaExamen> mapResp = respuestasExistentes.stream()
                .collect(Collectors.toMap(r -> r.getPregunta().getIdPregunta(), r -> r));

        int correctas = 0;
        BigDecimal puntajeTotal = BigDecimal.ZERO;

        for (ResponderExamenRequest.RespuestaItem ri : req.getRespuestas()) {
            RespuestaExamen re = mapResp.get(ri.getIdPregunta());
            if (re == null) continue; // pregunta no asignada a este examen

            re.setRespuestaMarcada(ri.getRespuesta());
            re.setFechaRespuesta(ahora);

            boolean esCorrecta = ri.getRespuesta() != null
                    && ri.getRespuesta().equals(re.getPregunta().getRespuestaCorrecta());
            re.setEsCorrecta(esCorrecta);
            re.setPuntajeObtenido(esCorrecta ? re.getPregunta().getPuntaje() : BigDecimal.ZERO);

            if (esCorrecta) {
                correctas++;
                puntajeTotal = puntajeTotal.add(re.getPregunta().getPuntaje());
            }
            respuestaRepo.save(re);
        }

        // Finalizar examen
        ep.setHoraFin(ahora);
        ep.setTotalCorrectas(correctas);
        ep.setPuntajeTotal(puntajeTotal);
        ep.setEstado(expirado ? "EXPIRADO" : "FINALIZADO");
        examenRepo.save(ep);

        // Registrar puntaje en TBL_POSTULACION.PUNTAJE_TECNICA (alimenta E29 cuadro méritos)
        registrarPuntajeTecnica(ep, cfg, http);

        audit.registrar("EXAMEN_POSTULANTE", ep.getIdExamenPostulante(),
                "FINALIZAR_EXAMEN", "EN_CURSO", ep.getEstado(), http,
                "Correctas: " + correctas + "/" + ep.getTotalPreguntas() + " Puntaje: " + puntajeTotal);

        return buildResultadoResponse(ep, cfg);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. RESULTADOS CONSOLIDADOS — ORH
    // ═══════════════════════════════════════════════════════════════════════

    /** ORH obtiene resultados de todos los postulantes. */
    @Transactional(readOnly = true)
    public List<ExamenPostulanteResponse.ResultadoConsolidado> resultadosConsolidados(Long idConv) {
        ConfigExamen cfg = configRepo.findByConvocatoriaId(idConv)
                .orElseThrow(() -> new DomainException("No hay examen configurado."));
        BigDecimal umbral = resolverFactoresTecnica(factorRepo.findByConvocatoriaId(idConv)).umbral();
        List<Postulacion> aptos = postRepo.findAptosByConvocatoriaWithPostulante(idConv);
        Map<Long, ExamenPostulante> porPostId = examenRepo
                .findByConfigExamenIdWithPostulacion(cfg.getIdConfigExamen()).stream()
                .collect(Collectors.toMap(
                        e -> e.getPostulacion().getIdPostulacion(), e -> e, (a, b) -> a));
        return aptos.stream()
                .map(p -> aConsolidado(p, porPostId.get(p.getIdPostulacion()), umbral))
                .toList();
    }

    private ExamenPostulanteResponse.ResultadoConsolidado aConsolidado(
            Postulacion post, ExamenPostulante ep, BigDecimal umbral) {
        if (ep == null) {
            return filaSinExamen(post);
        }
        return filaConExamen(post, ep, umbral);
    }

    private ExamenPostulanteResponse.ResultadoConsolidado filaSinExamen(Postulacion post) {
        return ExamenPostulanteResponse.ResultadoConsolidado.builder()
                .idPostulacion(post.getIdPostulacion())
                .nombrePostulante(nombrePostulante(post))
                .codigoAnonimo(post.getCodigoAnonimo())
                .estadoExamen("SIN_INICIAR")
                .puntajeTotal(null)
                .puntajeTecnicaEscala(null)
                .resultadoTecnica("PENDIENTE")
                .totalCorrectas(null)
                .totalPreguntas(null)
                .build();
    }

    private ExamenPostulanteResponse.ResultadoConsolidado filaConExamen(
            Postulacion post, ExamenPostulante ep, BigDecimal umbral) {
        String estado = ep.getEstado();
        boolean terminado = "FINALIZADO".equals(estado) || "EXPIRADO".equals(estado);
        if (!terminado) {
            return ExamenPostulanteResponse.ResultadoConsolidado.builder()
                    .idPostulacion(post.getIdPostulacion())
                    .nombrePostulante(nombrePostulante(post))
                    .codigoAnonimo(post.getCodigoAnonimo())
                    .estadoExamen(estado)
                    .puntajeTotal(null)
                    .puntajeTecnicaEscala(null)
                    .resultadoTecnica("PENDIENTE")
                    .totalCorrectas(ep.getTotalCorrectas())
                    .totalPreguntas(ep.getTotalPreguntas())
                    .build();
        }
        BigDecimal escala = post.getPuntajeTecnica();
        return ExamenPostulanteResponse.ResultadoConsolidado.builder()
                .idPostulacion(post.getIdPostulacion())
                .nombrePostulante(nombrePostulante(post))
                .codigoAnonimo(post.getCodigoAnonimo())
                .estadoExamen(estado)
                .puntajeTotal(ep.getPuntajeTotal())
                .puntajeTecnicaEscala(escala)
                .resultadoTecnica(clasificarTecnica(escala, umbral, post.getEstado()))
                .totalCorrectas(ep.getTotalCorrectas())
                .totalPreguntas(ep.getTotalPreguntas())
                .build();
    }

    private static String nombrePostulante(Postulacion post) {
        if (post.getPostulante() == null) {
            return "—";
        }
        return post.getPostulante().getNombres() + " " + post.getPostulante().getApellidoPaterno();
    }

    /** Coherente con registrarPuntajeTecnica: umbral E12 y estado post-examen. */
    private static String clasificarTecnica(BigDecimal escala, BigDecimal umbral, String estadoPostulacion) {
        if (escala == null) {
            return "PENDIENTE";
        }
        if ("NO_APTO".equals(estadoPostulacion)) {
            return "NO_APTO";
        }
        return escala.compareTo(umbral) >= 0 ? "APTO" : "NO_APTO";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS PRIVADOS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Normaliza el puntaje del examen virtual a la escala del factor TECNICA (RF-14)
     * y lo registra en Postulacion.puntajeTecnica para alimentar E29 cuadro de méritos.
     */
    private void registrarPuntajeTecnica(ExamenPostulante ep, ConfigExamen cfg, HttpServletRequest http) {
        Postulacion post = ep.getPostulacion();
        Long idConv = cfg.getConvocatoria().getIdConvocatoria();

        List<FactorEvaluacion> factores = factorRepo.findByConvocatoriaId(idConv);
        TecnicaFactores tf = resolverFactoresTecnica(factores);
        BigDecimal maxFactorTec = tf.maxFactor();

        // Puntaje máximo posible del examen = sum(puntaje) de las preguntas asignadas
        List<RespuestaExamen> respuestas = respuestaRepo.findByExamenPostulanteId(ep.getIdExamenPostulante());
        BigDecimal maxExamen = respuestas.stream()
                .map(r -> r.getPregunta().getPuntaje())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Normalizar: puntajeNormalizado = (puntajeObtenido / maxExamen) * maxFactorTec
        BigDecimal puntajeNormalizado;
        if (maxExamen.compareTo(BigDecimal.ZERO) > 0) {
            puntajeNormalizado = ep.getPuntajeTotal()
                    .divide(maxExamen, 6, RoundingMode.HALF_UP)
                    .multiply(maxFactorTec)
                    .setScale(2, RoundingMode.HALF_UP);
        } else {
            puntajeNormalizado = BigDecimal.ZERO;
        }

        String antEstado = post.getEstado();
        post.setPuntajeTecnica(puntajeNormalizado);

        BigDecimal umbral = tf.umbral();

        if (puntajeNormalizado.compareTo(umbral) < 0 && !"NO_APTO".equals(antEstado)) {
            post.setEstado("NO_APTO");
        }

        post.setUsuarioModificacion("SISTEMA");
        postRepo.save(post);

        audit.registrar("POSTULACION", post.getIdPostulacion(),
                "EVAL_TECNICA_VIRTUAL", antEstado, post.getEstado(), http,
                "Puntaje normalizado: " + puntajeNormalizado + " / umbral: " + umbral);
    }

    private ExamenPostulanteResponse buildExamenEnCurso(ExamenPostulante ep, ConfigExamen cfg) {
        List<RespuestaExamen> respuestas = respuestaRepo.findByExamenPostulanteId(ep.getIdExamenPostulante());
        LocalDateTime ahora = LocalDateTime.now();

        // Segundos restantes = min(fin_ventana, inicio+duración) - ahora
        LocalDateTime limiteVentana = cfg.getFechaHoraFin();
        LocalDateTime limiteDuracion = ep.getHoraInicio().plusMinutes(cfg.getDuracionMinutos());
        LocalDateTime limiteReal = limiteVentana.isBefore(limiteDuracion) ? limiteVentana : limiteDuracion;
        long segsRestantes = Math.max(0, ChronoUnit.SECONDS.between(ahora, limiteReal));

        List<PreguntaExamenResponse> pregs = respuestas.stream()
                .sorted(Comparator.comparingInt(RespuestaExamen::getOrdenMostrado))
                .map(r -> PreguntaExamenResponse.builder()
                        .idPregunta(r.getPregunta().getIdPregunta())
                        .orden(r.getOrdenMostrado())
                        .enunciado(r.getPregunta().getEnunciado())
                        .opcionA(r.getPregunta().getOpcionA())
                        .opcionB(r.getPregunta().getOpcionB())
                        .opcionC(r.getPregunta().getOpcionC())
                        .opcionD(r.getPregunta().getOpcionD())
                        .build())
                .collect(Collectors.toList());

        return ExamenPostulanteResponse.builder()
                .idExamenPostulante(ep.getIdExamenPostulante())
                .estado(ep.getEstado())
                .horaInicio(ep.getHoraInicio())
                .totalPreguntas(ep.getTotalPreguntas())
                .segundosRestantes(segsRestantes)
                .mostrarResultado(cfg.getMostrarResultado())
                .preguntas(pregs)
                .mensaje("Examen en curso. Tiempo restante: " + (segsRestantes / 60) + " minutos.")
                .build();
    }

    private ExamenPostulanteResponse buildResultadoResponse(ExamenPostulante ep, ConfigExamen cfg) {
        return ExamenPostulanteResponse.builder()
                .idExamenPostulante(ep.getIdExamenPostulante())
                .estado(ep.getEstado())
                .horaInicio(ep.getHoraInicio())
                .horaFin(ep.getHoraFin())
                .totalPreguntas(ep.getTotalPreguntas())
                .totalCorrectas(ep.getTotalCorrectas())
                .puntajeTotal(cfg.getMostrarResultado() ? ep.getPuntajeTotal() : null)
                .segundosRestantes(0)
                .mostrarResultado(cfg.getMostrarResultado())
                .mensaje(ep.getEstado().equals("EXPIRADO")
                        ? "El examen fue cerrado por tiempo. Sus respuestas fueron registradas."
                        : "Examen finalizado. Sus respuestas han sido registradas.")
                .build();
    }

    private ConfigExamenResponse mapConfigResponse(ConfigExamen cfg, long totalBanco, String msg) {
        Long idConv = cfg.getConvocatoria().getIdConvocatoria();
        ConfigExamenResponse.ConfigExamenResponseBuilder b = ConfigExamenResponse.builder()
                .idConfigExamen(cfg.getIdConfigExamen())
                .idConvocatoria(idConv)
                .numeroConvocatoria(cfg.getConvocatoria().getNumeroConvocatoria())
                .cantidadPreguntas(cfg.getCantidadPreguntas())
                .fechaHoraInicio(cfg.getFechaHoraInicio())
                .fechaHoraFin(cfg.getFechaHoraFin())
                .duracionMinutos(cfg.getDuracionMinutos())
                .mostrarResultado(cfg.getMostrarResultado())
                .estado(cfg.getEstado())
                .notificacionEnviada(cfg.getNotificacionEnviada())
                .postulantesNotificados(cfg.getCantPostulantesNotificados())
                .totalPreguntasBanco(totalBanco)
                .mensaje(msg);
        applyTecnicaCronogramaMeta(b, idConv);
        return b.build();
    }

    /** Misma lógica que registrarPuntajeTecnica — factores TECNICA raíz en convocatoria (E12). */
    private TecnicaFactores resolverFactoresTecnica(List<FactorEvaluacion> factores) {
        BigDecimal maxFactorTec = factores.stream()
                .filter(f -> "TECNICA".equals(f.getEtapaEvaluacion()) && f.getFactorPadre() == null)
                .map(FactorEvaluacion::getPuntajeMaximo)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (maxFactorTec.compareTo(BigDecimal.ZERO) == 0) {
            maxFactorTec = new BigDecimal("100");
        }
        BigDecimal umbral = factores.stream()
                .filter(f -> "TECNICA".equals(f.getEtapaEvaluacion())
                        && f.getFactorPadre() == null && f.getPuntajeMinimo() != null)
                .map(FactorEvaluacion::getPuntajeMinimo)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (umbral.compareTo(BigDecimal.ZERO) == 0) {
            umbral = maxFactorTec.multiply(new BigDecimal("0.60")).setScale(2, RoundingMode.HALF_UP);
        }
        return new TecnicaFactores(maxFactorTec, umbral);
    }

    private void applyTecnicaCronogramaMeta(ConfigExamenResponse.ConfigExamenResponseBuilder b, Long idConv) {
        TecnicaCronogramaMeta m = buildTecnicaCronogramaMeta(idConv);
        b.puntajeMinimoTecnica(m.minTecnica());
        b.puntajeMaximoTecnica(m.maxTecnica());
        b.fechaInicioCronogramaTecnica(m.cronInicio());
        b.fechaFinCronogramaTecnica(m.cronFin());
    }

    private void applyTecnicaCronogramaMeta(BancoPreguntaEstadoResponse.BancoPreguntaEstadoResponseBuilder b,
                                            Long idConv) {
        TecnicaCronogramaMeta m = buildTecnicaCronogramaMeta(idConv);
        b.puntajeMinimoTecnica(m.minTecnica());
        b.puntajeMaximoTecnica(m.maxTecnica());
        b.fechaInicioCronogramaTecnica(m.cronInicio());
        b.fechaFinCronogramaTecnica(m.cronFin());
    }

    private TecnicaCronogramaMeta buildTecnicaCronogramaMeta(Long idConv) {
        List<FactorEvaluacion> factores = factorRepo.findByConvocatoriaId(idConv);
        TecnicaFactores tf = resolverFactoresTecnica(factores);
        List<Cronograma> ct = cronoRepo.findByConvocatoriaId(idConv).stream()
                .filter(c -> "EVAL_TECNICA".equals(c.getEtapa()))
                .toList();
        String cronIni = null;
        String cronFin = null;
        if (!ct.isEmpty()) {
            LocalDate minIni = ct.stream().map(Cronograma::getFechaInicio).min(LocalDate::compareTo).orElse(null);
            LocalDate maxFin = ct.stream().map(Cronograma::getFechaFin).max(LocalDate::compareTo).orElse(null);
            if (minIni != null) {
                cronIni = minIni.toString();
            }
            if (maxFin != null) {
                cronFin = maxFin.toString();
            }
        }
        return new TecnicaCronogramaMeta(tf.umbral(), tf.maxFactor(), cronIni, cronFin);
    }

    /**
     * RN-EV-04/05/06: factores técnica coherentes, puntaje banco ≥ 1, fecha en cronograma EVAL_TECNICA (E10).
     */
    private void validarExamenConfiguracion(Long idConv, int cantPreg,
                                            LocalDateTime inicio, LocalDateTime fin) {
        if (fin.isBefore(inicio) || fin.isEqual(inicio)) {
            throw new DomainException("La fecha/hora de fin debe ser posterior a la de inicio.");
        }
        List<FactorEvaluacion> factores = factorRepo.findByConvocatoriaId(idConv);
        TecnicaFactores tf = resolverFactoresTecnica(factores);
        if (tf.umbral().compareTo(tf.maxFactor()) > 0) {
            throw new DomainException("El umbral mínimo de evaluación técnica (" + tf.umbral()
                    + " pts) no puede superar el puntaje máximo de la fase (" + tf.maxFactor()
                    + " pts). Revise los factores de evaluación en la convocatoria (E12).");
        }
        List<BancoPregunta> banco = bancoRepo.findByConvocatoriaId(idConv);
        for (BancoPregunta p : banco) {
            BigDecimal pj = p.getPuntaje();
            if (pj == null || pj.compareTo(BigDecimal.ONE) < 0) {
                throw new DomainException("Cada pregunta del banco debe tener puntaje mayor o igual a 1.");
            }
        }
        BigDecimal sumTopN = sumOfHighestNPuntajes(banco, cantPreg);
        if (sumTopN.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException("La suma de puntajes del banco para el examen configurado es inválida.");
        }
        validarFechaEnCronogramaTecnica(idConv, inicio.toLocalDate());
    }

    private BigDecimal sumOfHighestNPuntajes(List<BancoPregunta> banco, int n) {
        int take = Math.min(n, banco.size());
        return banco.stream()
                .map(BancoPregunta::getPuntaje)
                .filter(Objects::nonNull)
                .sorted(Comparator.reverseOrder())
                .limit(take)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void validarFechaEnCronogramaTecnica(Long idConv, LocalDate fechaExamen) {
        List<Cronograma> cronos = cronoRepo.findByConvocatoriaId(idConv).stream()
                .filter(c -> "EVAL_TECNICA".equals(c.getEtapa()))
                .toList();
        if (cronos.isEmpty()) {
            return;
        }
        boolean ok = cronos.stream().anyMatch(c ->
                !fechaExamen.isBefore(c.getFechaInicio()) && !fechaExamen.isAfter(c.getFechaFin()));
        if (!ok) {
            throw new DomainException(
                    "La fecha del examen debe estar dentro del cronograma de evaluación técnica (E10).");
        }
    }

    /**
     * Minutos entre inicio y fin de ventana ORH — misma regla que el campo duración (readonly) en frontend.
     * Límites 5–180 minutos.
     */
    private int duracionMinutosDesdeVentana(LocalDateTime inicio, LocalDateTime fin) {
        long m = ChronoUnit.MINUTES.between(inicio, fin);
        if (m < 5) {
            throw new DomainException(
                    "La ventana entre hora de inicio y fin debe ser de al menos 5 minutos.");
        }
        if (m > 180) {
            throw new DomainException(
                    "La ventana entre hora de inicio y fin no puede superar 180 minutos.");
        }
        return (int) m;
    }

    private record TecnicaFactores(BigDecimal maxFactor, BigDecimal umbral) {}

    private record TecnicaCronogramaMeta(BigDecimal minTecnica, BigDecimal maxTecnica,
                                         String cronInicio, String cronFin) {}
}
