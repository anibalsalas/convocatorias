package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.mapper.SeleccionMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.domain.exception.*;
import pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria;
import pe.gob.acffaa.sisconv.domain.enums.EstadoPostulacion;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.domain.repository.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * SeleccionService — PKG-03 Etapa 3: E24-E31.
 * Evaluacion Curricular, Tecnica, Entrevistas, Bonificaciones, Cuadro Meritos.
 * Motor de Reglas: RF-09, RF-10, RF-11, RF-13, RF-15, RF-16.
 * Coherencia: DDL_NEW.sql, PKG03_CONTRATO.md, Diagrama Flujo Etapa 3.
 *
 * Estados DDL CK_POST_ESTADO: REGISTRADO → VERIFICADO → APTO/NO_APTO → GANADOR/ACCESITARIO/NO_SELECCIONADO
 */
@Service
public class SeleccionService {
    private final IPostulacionRepository postRepo;
    private final IConvocatoriaRepository convRepo;
    private final IEvaluacionCurricularRepository evalCurrRepo;
    private final IEvaluacionTecnicaRepository evalTecRepo;
    private final IEntrevistaPersonalRepository entrevistaRepo;
    private final IEntrevistaMiembroRepository entMiembroRepo;
    private final IBonificacionRepository bonifRepo;
    private final ICuadroMeritosRepository meritoRepo;
    private final IFactorEvaluacionRepository factorRepo;
    private final IUsuarioRepository usuarioRepo;
    private final IAuditPort audit;
    private final SeleccionMapper mapper;
    private final NotificacionService notificacionService;
    private final ResultadosPdfGenerator pdfGenerator = new ResultadosPdfGenerator();

    public SeleccionService(IPostulacionRepository pr, IConvocatoriaRepository cr,
            IEvaluacionCurricularRepository ecr, IEvaluacionTecnicaRepository etr,
            IEntrevistaPersonalRepository epr, IEntrevistaMiembroRepository emr,
            IBonificacionRepository br, ICuadroMeritosRepository mr,
            IFactorEvaluacionRepository fr, IUsuarioRepository ur, IAuditPort a, SeleccionMapper m,
            NotificacionService ns) {
        this.postRepo=pr; this.convRepo=cr; this.evalCurrRepo=ecr; this.evalTecRepo=etr;
        this.entrevistaRepo=epr; this.entMiembroRepo=emr; this.bonifRepo=br;
        this.meritoRepo=mr; this.factorRepo=fr; this.usuarioRepo=ur; this.audit=a; this.mapper=m;
        this.notificacionService=ns;
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }

    /** Valida transición de estado Statechart antes de aplicar cambio — FIX #3 */
    private void validarTransicion(Postulacion p, String nuevoEstado) {
        EstadoPostulacion actual = EstadoPostulacion.valueOf(p.getEstado());
        EstadoPostulacion destino = EstadoPostulacion.valueOf(nuevoEstado);
        if (!actual.puedeTransicionarA(destino)) {
            throw new DomainException("Transicion de estado no permitida: " + p.getEstado() + " → " + nuevoEstado);
        }
    }

    private Usuario findEvaluador() {
        return usuarioRepo.findByUsername(user()).orElse(null);
    }

    /** E24 — POST /convocatorias/{id}/eval-curricular. CU-17, Motor RF-09 */
    @Transactional(timeout = 60)
    public EvalCurricularResponse evalCurricular(Long idConv, EvalCurricularRequest req, HttpServletRequest http) {
        convRepo.findById(idConv).orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<FactorEvaluacion> factores = factorRepo.findByConvocatoriaId(idConv);
        if (factores.isEmpty()) throw new DomainException("No hay factores configurados");

        // Umbral = puntajeMinimo del factor PADRE (factorPadre IS NULL) configurado por el Comité en E12
        BigDecimal umbralCurricular = factores.stream()
                .filter(f -> "CURRICULAR".equals(f.getEtapaEvaluacion())
                        && f.getFactorPadre() == null
                        && f.getPuntajeMinimo() != null)
                .map(FactorEvaluacion::getPuntajeMinimo)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        // Fallback: si el Comité no configuró puntajeMinimo, usar 60% del puntajeMaximo del padre
        if (umbralCurricular.compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal maxPadreCurr = factores.stream()
                    .filter(f -> "CURRICULAR".equals(f.getEtapaEvaluacion())
                            && f.getFactorPadre() == null && f.getPuntajeMaximo() != null)
                    .map(FactorEvaluacion::getPuntajeMaximo)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            umbralCurricular = maxPadreCurr.multiply(new BigDecimal("0.60")).setScale(2, RoundingMode.HALF_UP);
        }

        Usuario evaluador = findEvaluador();
        List<EvalCurricularResponse.ResultadoItem> resultados = new ArrayList<>();
        int aptos = 0, noAptos = 0;

        for (EvalCurricularRequest.EvalItem ei : req.getEvaluaciones()) {
            Postulacion post = postRepo.findById(ei.getIdPostulacion())
                    .orElseThrow(() -> new ResourceNotFoundException("Postulacion", ei.getIdPostulacion()));
            if (!"VERIFICADO".equals(post.getEstado()))
                throw new DomainException("Postulacion " + ei.getIdPostulacion() + " no esta VERIFICADO");

            String ant = post.getEstado();
            // Re-evaluación: eliminar rows anteriores antes de insertar nuevos (evita UK_EVAL_CURR y StaleObjectState)
            evalCurrRepo.deleteByPostulacionId(post.getIdPostulacion());

            BigDecimal total = BigDecimal.ZERO;
            for (EvalCurricularRequest.FactorPuntaje fp : ei.getFactores()) {
                FactorEvaluacion factor = factores.stream()
                        .filter(f -> f.getIdFactor().equals(fp.getIdFactor())).findFirst()
                        .orElseThrow(() -> new DomainException("Factor " + fp.getIdFactor() + " no encontrado"));
                evalCurrRepo.save(EvaluacionCurricular.builder()
                        .postulacion(post).factor(factor)
                        .puntajeObtenido(fp.getPuntaje())
                        .observacion(fp.getObservacion())
                        .evaluador(evaluador).build());
                total = total.add(fp.getPuntaje());
            }
            post.setPuntajeCurricular(total);
            boolean apto = total.compareTo(umbralCurricular) >= 0;
            // VERIFICADO → APTO | NO_APTO (DDL CK_POST_ESTADO)
            String nuevoEstado = apto ? "APTO" : "NO_APTO";
            validarTransicion(post, nuevoEstado);
            post.setEstado(nuevoEstado);
            post.setUsuarioModificacion(user());
            postRepo.save(post);
            audit.registrar("POSTULACION", post.getIdPostulacion(), "EVAL_CURRICULAR", ant, post.getEstado(), http, null);
            resultados.add(EvalCurricularResponse.ResultadoItem.builder()
                    .idPostulacion(post.getIdPostulacion())
                    .nombrePostulante(mapper.nombreCompleto(post.getPostulante()))
                    .puntajeTotal(total).estado(post.getEstado()).build());
            if (apto) aptos++; else noAptos++;
        }
        return EvalCurricularResponse.builder().idConvocatoria(idConv)
                .totalEvaluados(req.getEvaluaciones().size()).totalAptos(aptos).totalNoAptos(noAptos)
                .resultados(resultados).umbralAplicado(umbralCurricular)
                .mensaje("Evaluacion curricular completada").build();
    }

    /** E25 — POST /convocatorias/{id}/codigos-anonimos. CU-18, RF-10 */
    @Transactional
    public List<PostulacionResponse> asignarCodigosAnonimos(Long idConv, HttpServletRequest http) {
        convRepo.findById(idConv).orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<Postulacion> aptos = postRepo.findByConvocatoriaIdAndEstado(idConv, "APTO");
        if (aptos.isEmpty()) throw new DomainException("No hay postulaciones APTO");

        Collections.shuffle(aptos);
        List<PostulacionResponse> result = new ArrayList<>();
        for (int i = 0; i < aptos.size(); i++) {
            Postulacion p = aptos.get(i);
            p.setCodigoAnonimo(String.format("COD-%04d", i + 1));
            p.setUsuarioModificacion(user());
            postRepo.save(p);
            audit.registrar("POSTULACION", p.getIdPostulacion(), "ASIGNAR_CODIGO", null, p.getCodigoAnonimo(), http, null);
            result.add(mapper.toPostulacionResponse(p, null));
        }
        return result;
    }

    /** E25-NOTIF — POST /convocatorias/{id}/notificar-codigos-anonimos.
     *  ORH confirma que los códigos están listos y notifica al ROL COMITÉ para proceder con E26. */
    @Transactional
    public NotificarCodigosResponse notificarCodigosAnonimos(Long idConv, HttpServletRequest http) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<Postulacion> aptos = postRepo.findByConvocatoriaIdAndEstado(idConv, "APTO");
        if (aptos.isEmpty()) throw new DomainException("No hay postulantes APTO para notificar");
        long sinCodigo = aptos.stream().filter(p -> p.getCodigoAnonimo() == null).count();
        if (sinCodigo > 0)
            throw new DomainException("Faltan " + sinCodigo + " postulante(s) sin código anónimo. Ejecute primero E25.");

        conv.setNotificacionCodigosEnviada(true);
        conv.setUsuarioModificacion(user());
        convRepo.save(conv);

        String asunto = "Tiene " + aptos.size() + " Postulante"
                + (aptos.size() == 1 ? "" : "s") + " al " + conv.getNumeroConvocatoria()
                + " listo" + (aptos.size() == 1 ? "" : "s") + " para Evaluación Técnica";
        String contenido = "El ORH ha completado la asignación de códigos anónimos. "
                + aptos.size() + " postulante(s) están listos para E26 — Evaluación Técnica en la convocatoria "
                + conv.getNumeroConvocatoria() + ".";
        notificacionService.notificarRolConTipo("COMITE", conv, "CODIGOS_LISTOS", asunto, contenido, user());

        audit.registrar("CONVOCATORIA", idConv, "NOTIFICAR_CODIGOS_ANONIMOS", "false", "true", http, null);

        return NotificarCodigosResponse.builder()
                .idConvocatoria(idConv)
                .numeroConvocatoria(conv.getNumeroConvocatoria())
                .cantidadAptos(aptos.size())
                .mensaje("Comité notificado: " + aptos.size() + " postulante(s) con código anónimo asignado.")
                .build();
    }

    /** E27-NOTIF — POST /convocatorias/{id}/notificar-entrevista-orh.
     *  COMITÉ confirma que la entrevista está registrada y notifica al ROL ORH para proceder con E28/E31.
     *  Patrón simétrico a E25-NOTIF (ORH → COMITÉ). */
    @Transactional
    public NotificarCodigosResponse notificarEntrevistaOrh(Long idConv, HttpServletRequest http) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<Postulacion> conEntrevista = postRepo.findByConvocatoriaId(idConv).stream()
                .filter(p -> p.getPuntajeEntrevista() != null)
                .collect(java.util.stream.Collectors.toList());
        if (conEntrevista.isEmpty())
            throw new DomainException("No hay entrevistas registradas. Complete E27 antes de notificar.");

        conv.setNotificacionEntrevistaEnviada(true);
        conv.setUsuarioModificacion(user());
        convRepo.save(conv);

        String asunto = conv.getNumeroConvocatoria() + " tiene "
                + conEntrevista.size() + " postulante(s) con Entrevista registrada — listo para E28/E31";
        String contenido = "El COMITÉ ha completado la Entrevista Personal (E27). "
                + conEntrevista.size() + " postulante(s) están listos para Bonificaciones (E28) y Publicación (E31) en la convocatoria "
                + conv.getNumeroConvocatoria() + ".";
        notificacionService.notificarRolConTipo("ORH", conv, "ENTREVISTA_LISTA", asunto, contenido, user());

        audit.registrar("CONVOCATORIA", idConv, "NOTIFICAR_ENTREVISTA_ORH", "false", "true", http, null);

        return NotificarCodigosResponse.builder()
                .idConvocatoria(idConv)
                .numeroConvocatoria(conv.getNumeroConvocatoria())
                .cantidadAptos(conEntrevista.size())
                .mensaje("ORH notificado: " + conEntrevista.size() + " postulante(s) con entrevista registrada.")
                .build();
    }

    /** E26 — POST /convocatorias/{id}/eval-tecnica. CU-18, Motor RF-11
     *  Nota: Estado permanece APTO. Puntaje se registra en Postulacion.puntajeTecnica */
    @Transactional(timeout = 60)
    public EvalTecnicaResponse evalTecnica(Long idConv, EvalTecnicaRequest req, HttpServletRequest http) {
        convRepo.findById(idConv).orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<Postulacion> aptos = postRepo.findByConvocatoriaIdAndEstadoIn(idConv, List.of("APTO", "NO_APTO"));
        Map<String, Postulacion> mapCodigo = aptos.stream()
                .filter(p -> p.getCodigoAnonimo() != null)
                .collect(Collectors.toMap(Postulacion::getCodigoAnonimo, p -> p));

        Usuario evaluador = findEvaluador();
        List<FactorEvaluacion> factores = factorRepo.findByConvocatoriaId(idConv);

        // Umbral = puntajeMinimo del factor PADRE TECNICA configurado por el Comité en E12
        BigDecimal umbralTecnica = factores.stream()
                .filter(f -> "TECNICA".equals(f.getEtapaEvaluacion())
                        && f.getFactorPadre() == null
                        && f.getPuntajeMinimo() != null)
                .map(FactorEvaluacion::getPuntajeMinimo)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (umbralTecnica.compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal maxPadreTec = factores.stream()
                    .filter(f -> "TECNICA".equals(f.getEtapaEvaluacion())
                            && f.getFactorPadre() == null && f.getPuntajeMaximo() != null)
                    .map(FactorEvaluacion::getPuntajeMaximo)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            umbralTecnica = maxPadreTec.multiply(new BigDecimal("0.60")).setScale(2, RoundingMode.HALF_UP);
        }

        List<EvalTecnicaResponse.ResultadoTecItem> resultados = new ArrayList<>();

        for (EvalTecnicaRequest.EvalTecItem ei : req.getEvaluaciones()) {
            Postulacion post = mapCodigo.get(ei.getCodigoAnonimo());
            if (post == null) throw new DomainException("Codigo anonimo no encontrado: " + ei.getCodigoAnonimo());

            // Buscar factor de eval tecnica
            FactorEvaluacion factorTec = factores.stream()
                    .filter(f -> "TECNICA".equals(f.getEtapaEvaluacion())).findFirst().orElse(null);

            // Re-evaluación: eliminar rows anteriores antes de insertar (evita UK_EVAL_TEC)
            evalTecRepo.deleteByPostulacionId(post.getIdPostulacion());

            evalTecRepo.save(EvaluacionTecnica.builder()
                    .postulacion(post).factor(factorTec)
                    .codigoAnonimo(ei.getCodigoAnonimo())
                    .puntajeObtenido(ei.getPuntaje()).observacion(ei.getObservacion())
                    .evaluador(evaluador).build());

            String ant = post.getEstado();
            post.setPuntajeTecnica(ei.getPuntaje());
            boolean ok = ei.getPuntaje().compareTo(umbralTecnica) >= 0;
            // Si NO aprueba tecnica → NO_APTO. Si aprueba → permanece en su estado actual.
            // Re-edición: si ya es NO_APTO y sigue reprobando, skip validarTransicion (mismo estado).
            if (!ok) {
                if (!"NO_APTO".equals(ant)) {
                    validarTransicion(post, "NO_APTO");
                }
                post.setEstado("NO_APTO");
            }
            post.setUsuarioModificacion(user());
            postRepo.save(post);
            audit.registrar("POSTULACION", post.getIdPostulacion(), "EVAL_TECNICA", ant, post.getEstado(), http, null);
            resultados.add(EvalTecnicaResponse.ResultadoTecItem.builder()
                    .codigoAnonimo(ei.getCodigoAnonimo()).puntaje(ei.getPuntaje())
                    .estado(post.getEstado()).build());
        }
        return EvalTecnicaResponse.builder().idConvocatoria(idConv)
                .totalEvaluados(req.getEvaluaciones().size()).resultados(resultados)
                .umbralAplicado(umbralTecnica)
                .mensaje("Evaluacion tecnica completada").build();
    }

    /** E27 — POST /convocatorias/{id}/entrevistas. CU-19, RF-13 (quorum)
     *  Nota: Estado permanece APTO. Puntaje se registra en Postulacion.puntajeEntrevista */
    @Transactional
    public EntrevistaResponse entrevistas(Long idConv, EntrevistaRequest req, HttpServletRequest http) {
        convRepo.findById(idConv).orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<EntrevistaResponse.ResultadoEntItem> resultados = new ArrayList<>();
        boolean quorumGlobal = true;

        for (EntrevistaRequest.EntrevistaItem ei : req.getEntrevistas()) {
            Postulacion post = postRepo.findById(ei.getIdPostulacion())
                    .orElseThrow(() -> new ResourceNotFoundException("Postulacion", ei.getIdPostulacion()));
            if (!"APTO".equals(post.getEstado()))
                throw new DomainException("Postulacion " + ei.getIdPostulacion() + " no esta en APTO");

            int miembrosPresentes = ei.getPuntajesMiembros().size();
            int quorum = (miembrosPresentes / 2) + 1;
            boolean quorumOk = miembrosPresentes >= quorum;

            EntrevistaPersonal ent = entrevistaRepo.save(EntrevistaPersonal.builder()
                    .postulacion(post).fechaEntrevista(LocalDateTime.now())
                    .miembrosPresentes(miembrosPresentes)
                    .quorumAlcanzado(quorumOk).usuarioCreacion(user()).build());

            BigDecimal suma = BigDecimal.ZERO;
            for (EntrevistaRequest.MiembroPuntaje mp : ei.getPuntajesMiembros()) {
                entMiembroRepo.save(EntrevistaMiembro.builder()
                        .entrevista(ent)
                        .miembro(MiembroComite.builder().idMiembroComite(mp.getIdMiembroComite()).build())
                        .puntajeIndividual(mp.getPuntaje()).observacion(mp.getObservacion()).build());
                suma = suma.add(mp.getPuntaje());
            }
            BigDecimal promedio = suma.divide(BigDecimal.valueOf(miembrosPresentes), 2, RoundingMode.HALF_UP);
            ent.setPuntajePromedio(promedio);
            entrevistaRepo.save(ent);

            post.setPuntajeEntrevista(promedio);
            // Estado permanece APTO (DDL solo tiene 8 estados, no tiene ENTREVISTA)
            post.setUsuarioModificacion(user());
            postRepo.save(post);
            audit.registrar("POSTULACION", post.getIdPostulacion(), "ENTREVISTA", "APTO", "APTO", http,
                    "Puntaje=" + promedio + ",Quorum=" + quorumOk);
            if (!quorumOk) quorumGlobal = false;
            resultados.add(EntrevistaResponse.ResultadoEntItem.builder()
                    .idPostulacion(post.getIdPostulacion())
                    .nombrePostulante(mapper.nombreCompleto(post.getPostulante()))
                    .puntajePromedio(promedio).quorumAlcanzado(quorumOk).build());
        }
        return EntrevistaResponse.builder().idConvocatoria(idConv)
                .totalEntrevistados(req.getEntrevistas().size()).quorumGlobal(quorumGlobal)
                .resultados(resultados).mensaje("Entrevistas completadas").build();
    }

    /** E28 — POST /convocatorias/{id}/bonificaciones. CU-20, Motor RF-15
     *  CK_BONIF_TIPO: FFAA, DISCAPACIDAD, DEPORTISTA */
    @Transactional
    public BonificacionResponse bonificaciones(Long idConv, HttpServletRequest http) {
        Convocatoria conv = convRepo.findById(idConv).orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        // Bonificaciones se aplican a postulaciones APTO que ya completaron todas las etapas
        List<Postulacion> posts = postRepo.findByConvocatoriaIdAndEstado(idConv, "APTO");
        if (posts.isEmpty()) throw new DomainException("No hay postulaciones en estado APTO");

        List<BonificacionResponse.BonifItem> items = new ArrayList<>();
        for (Postulacion p : posts) {
            Postulante pt = p.getPostulante();
            BigDecimal base = calcularPuntajeBase(p);
            BigDecimal totalBonif = BigDecimal.ZERO;

            if (Boolean.TRUE.equals(pt.getEsLicenciadoFfaa())) {
                BigDecimal bonif = base.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
                bonifRepo.save(Bonificacion.builder().postulacion(p).tipoBonificacion("FFAA")
                        .porcentaje(new BigDecimal("10.00")).puntajeBase(base).puntajeAplicado(bonif)
                        .baseLegal("Ley 29248 - Licenciados FFAA").usuarioCreacion(user()).build());
                totalBonif = totalBonif.add(bonif);
                items.add(BonificacionResponse.BonifItem.builder().idPostulacion(p.getIdPostulacion())
                        .nombrePostulante(mapper.nombreCompleto(pt)).tipoBonificacion("FFAA")
                        .porcentaje(new BigDecimal("10.00")).puntajeBase(base).puntajeAplicado(bonif)
                        .baseLegal("Ley 29248").build());
            }
            if (Boolean.TRUE.equals(pt.getEsPersonaDiscap())) {
                BigDecimal bonif = base.multiply(new BigDecimal("0.15")).setScale(2, RoundingMode.HALF_UP);
                bonifRepo.save(Bonificacion.builder().postulacion(p).tipoBonificacion("DISCAPACIDAD")
                        .porcentaje(new BigDecimal("15.00")).puntajeBase(base).puntajeAplicado(bonif)
                        .baseLegal("Ley 29973 - Personas con Discapacidad").usuarioCreacion(user()).build());
                totalBonif = totalBonif.add(bonif);
                items.add(BonificacionResponse.BonifItem.builder().idPostulacion(p.getIdPostulacion())
                        .nombrePostulante(mapper.nombreCompleto(pt)).tipoBonificacion("DISCAPACIDAD")
                        .porcentaje(new BigDecimal("15.00")).puntajeBase(base).puntajeAplicado(bonif)
                        .baseLegal("Ley 29973").build());
            }
            if (Boolean.TRUE.equals(pt.getEsDeportistaDest())) {
                BigDecimal bonif = base.multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
                bonifRepo.save(Bonificacion.builder().postulacion(p).tipoBonificacion("DEPORTISTA")
                        .porcentaje(new BigDecimal("5.00")).puntajeBase(base).puntajeAplicado(bonif)
                        .baseLegal("Ley 27674 - Deportistas Destacados").usuarioCreacion(user()).build());
                totalBonif = totalBonif.add(bonif);
                items.add(BonificacionResponse.BonifItem.builder().idPostulacion(p.getIdPostulacion())
                        .nombrePostulante(mapper.nombreCompleto(pt)).tipoBonificacion("DEPORTISTA")
                        .porcentaje(new BigDecimal("5.00")).puntajeBase(base).puntajeAplicado(bonif)
                        .baseLegal("Ley 27674").build());
            }
            p.setPuntajeBonificacion(totalBonif);
            p.setUsuarioModificacion(user());
            postRepo.save(p);
            audit.registrar("POSTULACION", p.getIdPostulacion(), "BONIFICACION", null, totalBonif.toString(), http, null);
        }
        // Marcar flag E28 para habilitar E29/E31 en frontend
        conv.setBonificacionesCalculadas(true);
        conv.setUsuarioModificacion(user());
        convRepo.save(conv);
        return BonificacionResponse.builder().idConvocatoria(idConv)
                .totalBonificados(items.size()).bonificaciones(items)
                .mensaje("Bonificaciones RF-15 aplicadas").build();
    }

    /** E29-GET — GET /convocatorias/{id}/cuadro-meritos. Lee cuadro ya calculado sin recalcular. */
    public CuadroMeritosResponse obtenerCuadroMeritos(Long idConv) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<CuadroMeritos> meritos = new java.util.ArrayList<>(meritoRepo.findByConvocatoriaId(idConv));
        if (meritos.isEmpty()) throw new ResourceNotFoundException("CuadroMeritos", idConv);
        meritos.sort(Comparator.comparingInt(CuadroMeritos::getOrdenMerito));
        List<CuadroMeritosResponse.MeritoItem> cuadro = meritos.stream()
                .map(cm -> CuadroMeritosResponse.MeritoItem.builder()
                        .ordenMerito(cm.getOrdenMerito())
                        .idPostulacion(cm.getPostulacion().getIdPostulacion())
                        .nombrePostulante(mapper.nombreCompleto(cm.getPostulacion().getPostulante()))
                        .puntajeCurricular(cm.getPuntajeCurricular())
                        .puntajeTecnica(cm.getPuntajeTecnica())
                        .puntajeEntrevista(cm.getPuntajeEntrevista())
                        .puntajeBonificacion(cm.getPuntajeBonificacion())
                        .puntajeTotal(cm.getPuntajeTotal())
                        .resultado(cm.getResultado())
                        .build())
                .collect(Collectors.toList());
        return CuadroMeritosResponse.builder()
                .idConvocatoria(idConv)
                .numeroConvocatoria(conv.getNumeroConvocatoria())
                .totalPostulantes(meritos.size())
                .cuadro(cuadro)
                .mensaje("Cuadro de meritos RF-16 calculado")
                .build();
    }

    /** E29 — POST /convocatorias/{id}/cuadro-meritos. CU-21, Motor RF-16
     *  APTO → GANADOR | ACCESITARIO | NO_SELECCIONADO (DDL CK_POST_ESTADO + CK_CUADRO_RESULTADO) */
    @Transactional
    public CuadroMeritosResponse cuadroMeritos(Long idConv, HttpServletRequest http) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        // Opción A: también acepta estados finales para permitir re-cálculo RF-16
        List<Postulacion> posts = new java.util.ArrayList<>(
                postRepo.findByConvocatoriaIdAndEstadoIn(idConv,
                        java.util.List.of("APTO", "GANADOR", "ACCESITARIO", "NO_SELECCIONADO")));
        if (posts.isEmpty()) throw new DomainException("No hay postulaciones para cuadro de meritos");

        BigDecimal pesoCurr = conv.getPesoEvalCurricular().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        BigDecimal pesoTec = conv.getPesoEvalTecnica().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        BigDecimal pesoEnt = conv.getPesoEntrevista().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);

        // Calcular puntaje total ponderado
        for (Postulacion p : posts) {
            BigDecimal pc = Optional.ofNullable(p.getPuntajeCurricular()).orElse(BigDecimal.ZERO).multiply(pesoCurr);
            BigDecimal pt = Optional.ofNullable(p.getPuntajeTecnica()).orElse(BigDecimal.ZERO).multiply(pesoTec);
            BigDecimal pe = Optional.ofNullable(p.getPuntajeEntrevista()).orElse(BigDecimal.ZERO).multiply(pesoEnt);
            BigDecimal bonif = Optional.ofNullable(p.getPuntajeBonificacion()).orElse(BigDecimal.ZERO);
            p.setPuntajeTotal(pc.add(pt).add(pe).add(bonif).setScale(2, RoundingMode.HALF_UP));
            p.setUsuarioModificacion(user());
            postRepo.save(p);
        }

        // Ordenar por puntaje total descendente
        posts.sort((a, b) -> b.getPuntajeTotal().compareTo(a.getPuntajeTotal()));
        int cantPuestos = Optional.ofNullable(conv.getRequerimiento().getCantidadPuestos()).orElse(1);
        List<CuadroMeritosResponse.MeritoItem> cuadro = new ArrayList<>();

        for (int i = 0; i < posts.size(); i++) {
            Postulacion p = posts.get(i);
            // CK_CUADRO_RESULTADO: GANADOR, ACCESITARIO, NO_SELECCIONADO
            String estadoAnterior = p.getEstado();
            String resultado;
            if (i < cantPuestos) resultado = "GANADOR";
            else if (i < cantPuestos * 2) resultado = "ACCESITARIO";
            else resultado = "NO_SELECCIONADO";

            validarTransicion(p, resultado);
            p.setEstado(resultado);
            p.setOrdenMerito(i + 1);
            p.setResultado(resultado);
            p.setUsuarioModificacion(user());
            postRepo.save(p);

            meritoRepo.save(CuadroMeritos.builder()
                    .convocatoria(conv).postulacion(p)
                    .puntajeCurricular(p.getPuntajeCurricular()).puntajeTecnica(p.getPuntajeTecnica())
                    .puntajeEntrevista(p.getPuntajeEntrevista()).puntajeBonificacion(p.getPuntajeBonificacion())
                    .puntajeTotal(p.getPuntajeTotal()).ordenMerito(i + 1)
                    .resultado(resultado).usuarioCreacion(user()).build());

            audit.registrar("POSTULACION", p.getIdPostulacion(), "CUADRO_MERITOS", estadoAnterior, resultado, http, null);
            cuadro.add(CuadroMeritosResponse.MeritoItem.builder()
                    .ordenMerito(i + 1).idPostulacion(p.getIdPostulacion())
                    .nombrePostulante(mapper.nombreCompleto(p.getPostulante()))
                    .puntajeCurricular(p.getPuntajeCurricular()).puntajeTecnica(p.getPuntajeTecnica())
                    .puntajeEntrevista(p.getPuntajeEntrevista()).puntajeBonificacion(p.getPuntajeBonificacion())
                    .puntajeTotal(p.getPuntajeTotal()).resultado(resultado).build());
        }
        return CuadroMeritosResponse.builder().idConvocatoria(idConv)
                .numeroConvocatoria(conv.getNumeroConvocatoria())
                .totalPostulantes(posts.size()).cuadro(cuadro)
                .mensaje("Cuadro de meritos RF-16 calculado").build();
    }

    /** E24-PUBLICAR — POST /convocatorias/{id}/publicar-resultados-curricular.
     *  Acción explícita del ROL COMITÉ: persiste el flag resultadosCurricularesPublicados=true
     *  y retorna el PDF para descarga inmediata.
     *  Solo después de esta acción el portal muestra el ícono 📄 en la columna. */
    @Transactional
    public byte[] publicarResultadosCurricular(Long idConv, HttpServletRequest http) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        // Incluye: APTO/NO_APTO/GANADOR/ACCESITARIO/NO_SELECCIONADO (puntaje registrado)
        // + VERIFICADO con CON_SANCIONES o NO_ADMITIDO (de facto NO_APTO por DL1451/RF07)
        List<Postulacion> todos = postRepo.findByConvocatoriaId(idConv).stream()
                .filter(p -> p.getPuntajeCurricular() != null
                        || "CON_SANCIONES".equals(p.getVerificacionRnssc())
                        || "CON_SANCIONES".equals(p.getVerificacionRegiprec())
                        || "NO_ADMITIDO".equals(p.getAdmisionRf07()))
                .collect(Collectors.toList());
        if (todos.isEmpty())
            throw new DomainException("No hay resultados de evaluación curricular para publicar");

        conv.setResultadosCurricularesPublicados(true);
        conv.setUsuarioModificacion(user());
        convRepo.save(conv);
        audit.registrarConvocatoria(idConv, "CONVOCATORIA", idConv,
                "PUBLICAR_RESULT_CURRICULAR", "false", "true",
                "Publicación de resultados E24 — ROL COMITÉ", http);

        // Umbral para PDF consistente con scores (mismo cálculo que evalCurricular)
        List<FactorEvaluacion> factoresPub = factorRepo.findByConvocatoriaId(idConv);
        BigDecimal umbralPub = factoresPub.stream()
                .filter(f -> "CURRICULAR".equals(f.getEtapaEvaluacion())
                        && f.getFactorPadre() == null && f.getPuntajeMinimo() != null)
                .map(FactorEvaluacion::getPuntajeMinimo)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (umbralPub.compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal maxPadrePub = factoresPub.stream()
                    .filter(f -> "CURRICULAR".equals(f.getEtapaEvaluacion())
                            && f.getFactorPadre() == null && f.getPuntajeMaximo() != null)
                    .map(FactorEvaluacion::getPuntajeMaximo)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            umbralPub = maxPadrePub.multiply(new BigDecimal("0.60")).setScale(2, RoundingMode.HALF_UP);
        }
        final BigDecimal umbralPubFinal = umbralPub;
        todos.sort(Comparator
                .comparing((Postulacion p) -> p.getPuntajeCurricular() != null
                        && p.getPuntajeCurricular().compareTo(umbralPubFinal) >= 0 ? 0 : 1)
                .thenComparing(p -> Optional.ofNullable(p.getPuntajeCurricular()).orElse(BigDecimal.ZERO), Comparator.reverseOrder()));
        return new ResultadosCurricularPdfGenerator().generar(conv, todos, umbralPubFinal);
    }

    /** E24-PDF — GET /convocatorias/{id}/resultados-curricular-pdf.
     *  Genera PDF con listado APTO/NO_APTO de evaluación curricular.
     *  APTO/NO_APTO se determina por puntajeCurricular >= umbralCurricular (RF-09),
     *  no por el estado almacenado, para ser consistente cuando el postulante avanzó a E29. */
    public byte[] generarResultadosCurricularPdf(Long idConv) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        // Calcular umbral igual que evalCurricular()
        List<FactorEvaluacion> factores = factorRepo.findByConvocatoriaId(idConv);
        BigDecimal umbral = factores.stream()
                .filter(f -> "CURRICULAR".equals(f.getEtapaEvaluacion())
                        && f.getFactorPadre() == null && f.getPuntajeMinimo() != null)
                .map(FactorEvaluacion::getPuntajeMinimo)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (umbral.compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal maxPadre = factores.stream()
                    .filter(f -> "CURRICULAR".equals(f.getEtapaEvaluacion())
                            && f.getFactorPadre() == null && f.getPuntajeMaximo() != null)
                    .map(FactorEvaluacion::getPuntajeMaximo)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            umbral = maxPadre.multiply(new BigDecimal("0.60")).setScale(2, RoundingMode.HALF_UP);
        }
        // Todos los postulantes con puntaje curricular registrado
        // + VERIFICADO con CON_SANCIONES o NO_ADMITIDO (de facto NO_APTO, puntaje=0)
        List<Postulacion> todos = postRepo.findByConvocatoriaId(idConv).stream()
                .filter(p -> p.getPuntajeCurricular() != null
                        || "CON_SANCIONES".equals(p.getVerificacionRnssc())
                        || "CON_SANCIONES".equals(p.getVerificacionRegiprec())
                        || "NO_ADMITIDO".equals(p.getAdmisionRf07()))
                .collect(Collectors.toList());
        if (todos.isEmpty()) throw new DomainException("No hay resultados de evaluación curricular para esta convocatoria");
        final BigDecimal umbralFinal = umbral;
        todos.sort(Comparator
                .comparing((Postulacion p) -> Optional.ofNullable(p.getPuntajeCurricular())
                        .map(pc -> pc.compareTo(umbralFinal) >= 0 ? 0 : 1).orElse(1))
                .thenComparing(p -> Optional.ofNullable(p.getPuntajeCurricular())
                        .orElse(BigDecimal.ZERO), Comparator.reverseOrder()));
        return new ResultadosCurricularPdfGenerator().generar(conv, todos, umbralFinal);
    }

    /** E26-PUBLICAR — POST /convocatorias/{id}/publicar-resultados-tecnica.
     *  Acción explícita del ROL COMITÉ: persiste el flag resultadosTecnicosPublicados=true
     *  y retorna el PDF para descarga inmediata.
     *  Solo después de esta acción el portal muestra el ícono 📄 en la columna Resultados Técnica. */
    @Transactional
    public byte[] publicarResultadosTecnica(Long idConv, HttpServletRequest http) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<Postulacion> conPuntaje = postRepo.findByConvocatoriaId(idConv).stream()
                .filter(p -> p.getPuntajeTecnica() != null)
                .collect(java.util.stream.Collectors.toList());
        if (conPuntaje.isEmpty())
            throw new DomainException("No hay resultados de evaluación técnica para publicar");

        conv.setResultadosTecnicosPublicados(true);
        conv.setUsuarioModificacion(user());
        convRepo.save(conv);
        audit.registrarConvocatoria(idConv, "CONVOCATORIA", idConv,
                "PUBLICAR_RESULT_TECNICA", "false", "true",
                "Publicación de resultados E26 — ROL COMITÉ", http);

        conPuntaje.sort(Comparator
                .comparing((Postulacion p) -> "APTO".equals(p.getEstado()) ? 0 : 1)
                .thenComparing(p -> Optional.ofNullable(p.getPuntajeTecnica()).orElse(BigDecimal.ZERO),
                        Comparator.reverseOrder()));
        return new ResultadosTecnicaPdfGenerator().generar(conv, conPuntaje);
    }

    /** E26-PDF — GET /convocatorias/{id}/resultados-tecnica-pdf.
     *  Genera PDF con puntajes técnicos registrados.
     *  Accesible por COMITÉ (descarga interna) y portal público (sin auth, via /publicas/). */
    public byte[] generarResultadosTecnicaPdf(Long idConv) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<Postulacion> conPuntaje = postRepo.findByConvocatoriaId(idConv).stream()
                .filter(p -> p.getPuntajeTecnica() != null)
                .collect(java.util.stream.Collectors.toList());
        if (conPuntaje.isEmpty())
            throw new DomainException("No hay resultados de evaluación técnica para esta convocatoria");
        conPuntaje.sort(Comparator
                .comparing(p -> Optional.ofNullable(p.getPuntajeTecnica()).orElse(BigDecimal.ZERO),
                        Comparator.reverseOrder()));
        return new ResultadosTecnicaPdfGenerator().generar(conv, conPuntaje);
    }

    /** E27-PUBLICAR — POST /convocatorias/{id}/publicar-resultados-entrevista.
     *  Acción explícita del ROL COMITÉ: persiste el flag entrevistaPublicada=true
     *  y retorna el PDF para descarga inmediata. */
    @Transactional
    public byte[] publicarResultadosEntrevista(Long idConv, HttpServletRequest http) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<Postulacion> conPuntaje = postRepo.findByConvocatoriaId(idConv).stream()
                .filter(p -> p.getPuntajeEntrevista() != null)
                .collect(java.util.stream.Collectors.toList());
        if (conPuntaje.isEmpty())
            throw new DomainException("No hay resultados de entrevista para publicar");

        conv.setEntrevistaPublicada(true);
        conv.setUsuarioModificacion(user());
        convRepo.save(conv);
        audit.registrarConvocatoria(idConv, "CONVOCATORIA", idConv,
                "PUBLICAR_RESULT_ENTREVISTA", "false", "true",
                "Publicación de resultados E27 — ROL COMITÉ", http);

        conPuntaje.sort(Comparator
                .comparing(p -> Optional.ofNullable(p.getPuntajeEntrevista()).orElse(BigDecimal.ZERO),
                        Comparator.reverseOrder()));
        return new ResultadosEntrevistaPdfGenerator().generar(conv, conPuntaje);
    }

    /** E27-PDF — GET /convocatorias/{id}/resultados-entrevista-pdf. */
    public byte[] generarResultadosEntrevistaPdf(Long idConv) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<Postulacion> conPuntaje = postRepo.findByConvocatoriaId(idConv).stream()
                .filter(p -> p.getPuntajeEntrevista() != null)
                .collect(java.util.stream.Collectors.toList());
        if (conPuntaje.isEmpty())
            throw new DomainException("No hay resultados de entrevista para esta convocatoria");
        conPuntaje.sort(Comparator
                .comparing(p -> Optional.ofNullable(p.getPuntajeEntrevista()).orElse(BigDecimal.ZERO),
                        Comparator.reverseOrder()));
        return new ResultadosEntrevistaPdfGenerator().generar(conv, conPuntaje);
    }

    /** E30 — GET /convocatorias/{id}/resultados-pdf. CU-22 */
    public byte[] generarResultadosPdf(Long idConv) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        List<CuadroMeritos> meritos = new java.util.ArrayList<>(meritoRepo.findByConvocatoriaId(idConv));
        if (meritos.isEmpty()) throw new DomainException("No hay cuadro de meritos calculado");

        meritos.sort(Comparator.comparingInt(CuadroMeritos::getOrdenMerito));
        return pdfGenerator.generar(conv, meritos);
    }

    /** E31 — POST /convocatorias/{id}/publicar-resultados. CU-22
     *  Phase 1 (sync/REQUIRED TX): transición FINALIZADA + log transparencia + encolado PENDIENTE.
     *  Phase 2 (@Async) es disparada desde el controller DESPUÉS de que esta TX se confirma. */
    @Transactional
    public PublicarResultadosResponse publicarResultados(Long idConv, HttpServletRequest http) {
        Convocatoria conv = convRepo.findById(idConv)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
        if (conv.getEstado() != EstadoConvocatoria.EN_SELECCION)
            throw new DomainException("Convocatoria no esta EN_SELECCION");
        List<CuadroMeritos> meritos = new java.util.ArrayList<>(meritoRepo.findByConvocatoriaId(idConv));
        if (meritos.isEmpty()) throw new DomainException("No hay cuadro de meritos para publicar");

        EstadoConvocatoria destino = EstadoConvocatoria.FINALIZADA;
        if (!conv.getEstado().puedeTransicionarA(destino)) {
            throw new DomainException("Transición inválida: " + conv.getEstado() + " → " + destino);
        }
        conv.setEstado(destino);
        conv.setUsuarioModificacion(user());
        convRepo.save(conv);
        audit.registrarConvocatoria(idConv, "CONVOCATORIA", idConv, "PUBLICAR_RESULTADOS",
                EstadoConvocatoria.EN_SELECCION.name(), EstadoConvocatoria.FINALIZADA.name(),
                "Publicación de resultados finales y cuadro de méritos",
                http);

        // Phase 1: encolar notificaciones PENDIENTE (misma TX — irreversible aunque SMTP esté caído)
        List<Postulacion> postulaciones = meritos.stream()
                .map(CuadroMeritos::getPostulacion).collect(Collectors.toList());
        int encoladas = notificacionService.encolarNotificacionesMasivas(conv, postulaciones, user());

        meritos.sort(Comparator.comparingInt(CuadroMeritos::getOrdenMerito));
        List<CuadroMeritosResponse.MeritoItem> cuadro = meritos.stream()
                .map(cm -> CuadroMeritosResponse.MeritoItem.builder()
                        .ordenMerito(cm.getOrdenMerito()).idPostulacion(cm.getPostulacion().getIdPostulacion())
                        .nombrePostulante(mapper.nombreCompleto(cm.getPostulacion().getPostulante()))
                        .puntajeCurricular(cm.getPuntajeCurricular()).puntajeTecnica(cm.getPuntajeTecnica())
                        .puntajeEntrevista(cm.getPuntajeEntrevista()).puntajeBonificacion(cm.getPuntajeBonificacion())
                        .puntajeTotal(cm.getPuntajeTotal()).resultado(cm.getResultado()).build())
                .collect(Collectors.toList());
        return PublicarResultadosResponse.builder().idConvocatoria(idConv)
                .numeroConvocatoria(conv.getNumeroConvocatoria())
                .totalPostulantes(meritos.size()).notificacionesEncoladas(encoladas).cuadro(cuadro)
                .mensaje("Resultados publicados. Convocatoria FINALIZADA. " + encoladas + " notificaciones encoladas.").build();
    }

    private BigDecimal calcularPuntajeBase(Postulacion p) {
        BigDecimal curr = Optional.ofNullable(p.getPuntajeCurricular()).orElse(BigDecimal.ZERO);
        BigDecimal tec = Optional.ofNullable(p.getPuntajeTecnica()).orElse(BigDecimal.ZERO);
        BigDecimal ent = Optional.ofNullable(p.getPuntajeEntrevista()).orElse(BigDecimal.ZERO);
        return curr.add(tec).add(ent);
    }
}