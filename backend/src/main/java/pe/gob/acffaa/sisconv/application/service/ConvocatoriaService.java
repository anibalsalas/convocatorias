package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.ActividadCronogramaResponse;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.mapper.ConvocatoriaMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.domain.repository.*;

import pe.gob.acffaa.sisconv.application.dto.request.MiembroComiteRequest;
import pe.gob.acffaa.sisconv.application.dto.response.ComiteDetalleResponse;
import pe.gob.acffaa.sisconv.infrastructure.persistence.JpaMiembroComiteRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
/**
 * Servicio de gestión de Convocatorias CAS — PKG-02 Etapa 2.
 *
 * Flujo BPMN Etapa 2:
 *   E9:  ORH crea convocatoria → EN_ELABORACION (hereda pesos Motor RF-14)
 *   E10: ORH registra cronograma de actividades
 *   E11: ORH registra comité de selección + notifica miembros
 *   E12: Comité configura factores de evaluación (alimenta Motor RF-14 Etapa 3)
 *   E13: Sistema genera Acta de Instalación PDF
 *   E14: Comité carga Acta firmada (multipart)
 *   E15: ORH aprueba y publica simultáneamente → PUBLICADA (D.S. 065-2011-PCM)
 *   E16: ORH genera bases en PDF (JasperReports — placeholder texto)
 *
 * Precondiciones:
 *   CU-06: Requerimiento en estado CONFIGURADO
 *   CU-07: Convocatoria en estado EN_ELABORACION
 *   CU-09: Comité y factores registrados
 *   CU-10: Acta de instalación firmada
 *
 * Auditoría: Cada operación registra en TBL_LOG_TRANSPARENCIA (D.L. 1451).
 */
@Service
public class ConvocatoriaService {

    private final IConvocatoriaRepository convRepo;
    private final IRequerimientoRepository reqRepo;
    private final ICronogramaRepository cronoRepo;
    private final IComiteSeleccionRepository comiteRepo;
    private final IFactorEvaluacionRepository factorRepo;
    private final IActaRepository actaRepo;
    private final IReglaMotorRepository reglaRepo;
    private final ConvocatoriaMapper mapper;
    private final IAuditPort auditPort;
    private final NotificacionService notificacionService;

    private final JpaMiembroComiteRepository miembroJpaRepo;
    private final BasesPdfGenerator basesPdfGenerator;

    public ConvocatoriaService(IConvocatoriaRepository convRepo,
                               IRequerimientoRepository reqRepo,
                               ICronogramaRepository cronoRepo,
                               IComiteSeleccionRepository comiteRepo,
                               IFactorEvaluacionRepository factorRepo,
                               IActaRepository actaRepo,
                               IReglaMotorRepository reglaRepo,
                               ConvocatoriaMapper mapper,
                               IAuditPort auditPort,
                               NotificacionService notificacionService,
                               JpaMiembroComiteRepository miembroJpaRepo)
                                {
        this.convRepo = convRepo;
        this.reqRepo = reqRepo;
        this.cronoRepo = cronoRepo;
        this.comiteRepo = comiteRepo;
        this.factorRepo = factorRepo;
        this.actaRepo = actaRepo;
        this.reglaRepo = reglaRepo;
        this.mapper = mapper;
        this.auditPort = auditPort;
        this.notificacionService = notificacionService;
        this.miembroJpaRepo = miembroJpaRepo;
        this.basesPdfGenerator = new BasesPdfGenerator();
    }

        private static final List<String> ETAPAS_CRONOGRAMA_ORDENADAS = List.of(
                "POSTULACION",
                "EVALUACION_CURRICULAR",
                "EVALUACION_TECNICA",
                "ENTREVISTA",
                "RESULTADOS"
                );

        private static final Map<String, String> ETIQUETAS_ETAPA = Map.of(
                "POSTULACION", "Postulación",
                "EVALUACION_CURRICULAR", "Evaluación Curricular",
                "EVALUACION_TECNICA", "Evaluación Técnica",
                "ENTREVISTA", "Entrevista",
                "RESULTADOS", "Resultados"
        );

        /** Mapeo API -> DB: CK_CRONO_ETAPA espera EVAL_CURRICULAR, EVAL_TECNICA, RESULTADO */
        private static final Map<String, String> ETAPA_API_TO_DB = Map.of(
                "POSTULACION", "POSTULACION",
                "EVALUACION_CURRICULAR", "EVAL_CURRICULAR",
                "EVALUACION_TECNICA", "EVAL_TECNICA",
                "ENTREVISTA", "ENTREVISTA",
                "RESULTADOS", "RESULTADO"
        );

        /** Mapeo DB -> API para respuesta consistente */
        private static final Map<String, String> ETAPA_DB_TO_API = Map.of(
                "POSTULACION", "POSTULACION",
                "EVAL_CURRICULAR", "EVALUACION_CURRICULAR",
                "EVAL_TECNICA", "EVALUACION_TECNICA",
                "ENTREVISTA", "ENTREVISTA",
                "RESULTADO", "RESULTADOS"
        );

    // ══════════════════════════════════════════════════════════════
    // CONSULTAS
    // ══════════════════════════════════════════════════════════════

    public Page<ConvocatoriaResponse> listar(String estado, Pageable pageable) {
        Page<Convocatoria> page = (estado != null && !estado.isBlank())
                ? convRepo.findByEstado(estado, pageable)
                : convRepo.findAll(pageable);
        return page.map(this::enriquecerResponse);
    }

    public ConvocatoriaResponse obtenerPorId(Long id) {
        Convocatoria conv = buscarConvocatoria(id);
        return enriquecerResponse(conv);
    }

    /**
     * Enriquece ConvocatoriaResponse con flags para habilitación de iconos (plan M02).
     * Comité: cronogramaConformado. Ver bases: cronogramaConformado && tieneFactoresPeso100.
     * Publicar: basesGeneradas && tieneActaFirmada.
     */
    private ConvocatoriaResponse enriquecerResponse(Convocatoria conv) {
        ConvocatoriaResponse r = mapper.toResponse(conv);
        Long id = conv.getIdConvocatoria();
        boolean cronogramaConformado = isCronogramaConformado(id);
        boolean tieneFactoresPeso100 = isTieneFactoresPeso100(id);
        boolean tieneActaFirmada = isTieneActaFirmada(id);
        r.setCronogramaConformado(cronogramaConformado);
        r.setTieneFactoresPeso100(tieneFactoresPeso100);
        r.setTieneActaFirmada(tieneActaFirmada);
        r.setBasesGeneradas(cronogramaConformado && tieneFactoresPeso100);
        return r;
    }

    private boolean isCronogramaConformado(Long idConvocatoria) {
        List<Cronograma> actividades = cronoRepo.findByConvocatoriaId(idConvocatoria);
        if (actividades == null || actividades.size() != 5) return false;
        Set<String> etapas = actividades.stream()
                .map(c -> etapaFromDb(c.getEtapa()))
                .collect(Collectors.toSet());
        if (!etapas.containsAll(ETAPAS_CRONOGRAMA_ORDENADAS)) return false;
        LocalDate[] rangoPostulacion = null;
        for (Cronograma c : actividades) {
            if ("POSTULACION".equals(etapaFromDb(c.getEtapa()))) {
                rangoPostulacion = new LocalDate[]{c.getFechaInicio(), c.getFechaFin()};
                break;
            }
        }
        if (rangoPostulacion == null) return false;
        return calcularDiasHabiles(rangoPostulacion[0], rangoPostulacion[1]) >= 10;
    }

    private boolean isTieneFactoresPeso100(Long idConvocatoria) {
        List<FactorEvaluacion> fases = factorRepo.findByConvocatoriaIdSoloFases(idConvocatoria);
        if (fases == null || fases.isEmpty()) return false;
        BigDecimal suma = fases.stream()
                .map(f -> f.getPesoCriterio() != null ? f.getPesoCriterio() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return suma.setScale(2, RoundingMode.HALF_UP).compareTo(new BigDecimal("100.00")) == 0;
    }

    private boolean isTieneActaFirmada(Long idConvocatoria) {
        return actaRepo.findByConvocatoriaIdAndTipoActa(idConvocatoria, "INSTALACION")
                .map(a -> Boolean.TRUE.equals(a.getFirmada()))
                .orElse(false);
    }

    /**
     * GET /convocatorias/{id}/cronograma — Lista actividades del cronograma.
     * Máximo 5 actividades (una por etapa). Sin paginación.
     */
    public List<ActividadCronogramaResponse> listarCronograma(Long idConvocatoria) {
        buscarConvocatoria(idConvocatoria);
        List<Cronograma> actividades = cronoRepo.findByConvocatoriaId(idConvocatoria);
        return actividades.stream()
                .map(c -> new ActividadCronogramaResponse(
                        c.getIdCronograma(),
                        etapaFromDb(c.getEtapa()),
                        c.getActividad(),
                        c.getFechaInicio(),
                        c.getFechaFin(),
                        c.getResponsable(),
                        c.getLugar(),
                        c.getOrden()
                ))
                .toList();
    }

    

    /**
     * ETAPA6 B6: Listado público de convocatorias (sin autenticación)
     * Solo estados visibles: PUBLICADA, EN_SELECCION, FINALIZADA
     * Retorna ConvocatoriaPublicaResponse (datos recortados, sin internos)
     */
    public Page<ConvocatoriaPublicaResponse> listarPublicas(Integer anio, Pageable pageable) {
        var estadosPublicos = java.util.List.of("PUBLICADA", "EN_SELECCION", "FINALIZADA");
    
        Page<Convocatoria> page = (anio != null)
                ? convRepo.findByEstadoInAndAnio(estadosPublicos, anio, pageable)
                : convRepo.findByEstadoIn(estadosPublicos, pageable);
    
        return page.map(conv -> ConvocatoriaPublicaResponse.builder()
                .idConvocatoria(conv.getIdConvocatoria())
                .numeroConvocatoria(conv.getNumeroConvocatoria())
                .descripcion(conv.getDescripcion())
                .objetoContratacion(conv.getObjetoContratacion())
                .estado(conv.getEstado())
                .anio(conv.getAnio())
                .nombrePuesto(conv.getRequerimiento() != null
                        && conv.getRequerimiento().getPerfilPuesto() != null
                        ? conv.getRequerimiento().getPerfilPuesto().getDenominacionPuesto()
                        : null)
                .unidadOrganica(conv.getRequerimiento() != null
                        && conv.getRequerimiento().getPerfilPuesto() != null
                        ? conv.getRequerimiento().getPerfilPuesto().getUnidadOrganica()
                        : null)
                .fuenteFinanciamiento(null)
                .fechaPublicacion(conv.getFechaPublicacion())
                .fechaIniPostulacion(conv.getFechaIniPostulacion())
                .fechaFinPostulacion(conv.getFechaFinPostulacion())
                .fechaEvaluacion(conv.getFechaEvaluacion())
                .fechaResultado(conv.getFechaResultado())
                .linkPortalAcffaa(conv.getLinkPortalAcffaa())
                .linkTalentoPeru(conv.getLinkTalentoPeru())
                .build());
    }

    public String obtenerSiguienteNumeroConvocatoria() {
        long correlativo = convRepo.nextNumeroConvocatoriaSequenceValue();
        return formatCasNumero(correlativo, Year.now().getValue());
    }

    // ══════════════════════════════════════════════════════════════
    // E9 — Crear convocatoria CAS
    // ══════════════════════════════════════════════════════════════

    /**
     * E9: POST /convocatorias — CU-06.
     * Precondición: Requerimiento CONFIGURADO.
     * Hereda pesos del Motor RF-14.
     * Genera número CAS-NNN-YYYY con SEQ_NUM_CONVOCATORIA.
     */
    @Transactional
    public ConvocatoriaResponse crear(ConvocatoriaRequest request, String username,
                                       Long idUsuario, HttpServletRequest httpReq) {
        // Validar requerimiento CONFIGURADO
        Requerimiento req = reqRepo.findById(request.getIdRequerimiento())
                .orElseThrow(() -> new ResourceNotFoundException("Requerimiento", request.getIdRequerimiento()));

        if (!"CONFIGURADO".equals(req.getEstado())) {
            throw new DomainException("Requerimiento debe estar en estado CONFIGURADO. Actual: " + req.getEstado());
        }

        // Validar que no exista ya una convocatoria para este requerimiento
        if (convRepo.existsByIdRequerimiento(request.getIdRequerimiento())) {
            throw new DomainException("Ya existe una convocatoria para el requerimiento ID=" + request.getIdRequerimiento());
        }

        // Heredar pesos del Motor RF-14
        BigDecimal pesoCurricular = new BigDecimal("30.00");
        BigDecimal pesoTecnica = new BigDecimal("35.00");
        BigDecimal pesoEntrevista = new BigDecimal("35.00");

        List<ReglaMotor> reglas = reglaRepo.findByIdRequerimiento(req.getIdRequerimiento());
        for (ReglaMotor regla : reglas) {
            if ("CALCULO".equals(regla.getTipoRegla()) && regla.getEtapaEvaluacion() != null) {
                switch (regla.getEtapaEvaluacion()) {
                    case "CURRICULAR" -> pesoCurricular = regla.getPeso();
                    case "TECNICA"    -> pesoTecnica = regla.getPeso();
                    case "ENTREVISTA" -> pesoEntrevista = regla.getPeso();
                }
            }
        }

        int anio = Year.now().getValue();
        String numero = request.getNumeroConvocatoria();
        if (numero == null || numero.isBlank()) {
            long correlativo = convRepo.nextNumeroConvocatoriaSequenceValue();
            numero = formatCasNumero(correlativo, anio);
        }

        // Crear entidad
        Convocatoria conv = Convocatoria.builder()
                .numeroConvocatoria(numero)
                .requerimiento(req)
                .descripcion(request.getDescripcion())
                .objetoContratacion(request.getObjetoContratacion())
                .anio(anio)
                .pesoEvalCurricular(pesoCurricular)
                .pesoEvalTecnica(pesoTecnica)
                .pesoEntrevista(pesoEntrevista)
                .fechaPublicacion(request.getFechaPublicacion())
                .fechaIniPostulacion(request.getFechaIniPostulacion())
                .fechaFinPostulacion(request.getFechaFinPostulacion())
                .fechaEvaluacion(request.getFechaEvaluacion())
                .fechaResultado(request.getFechaResultado())
                .estado("EN_ELABORACION")
                .usuarioCreacion(username)
                .build();

        conv = convRepo.save(conv);

        // Auditoría
        auditPort.registrarConvocatoria(conv.getIdConvocatoria(),
                "TBL_CONVOCATORIA", conv.getIdConvocatoria(),
                "CREAR", null, "EN_ELABORACION", httpReq);

           

        notificacionService.notificarRol(
                    "ORH",
                    conv,
                    "Convocatoria creada",
                    "La convocatoria " + conv.getNumeroConvocatoria() + " fue creada y quedó en EN_ELABORACION.",
                    username
            );

        ConvocatoriaResponse response = mapper.toResponse(conv);
        response.setMensaje("Convocatoria creada: " + numero);
        return response;
    }

    // ══════════════════════════════════════════════════════════════
    // E10 — Registrar cronograma
    // ══════════════════════════════════════════════════════════════

    /**
     * E10: POST /convocatorias/{id}/cronograma — CU-06.
     * Registra actividades del cronograma con etapas, fechas, responsables.
     */
    @Transactional
    public CronogramaResponse registrarCronograma(Long idConvocatoria, CronogramaRequest request,
                                                   String username, HttpServletRequest httpReq) {
        Convocatoria conv = buscarConvocatoria(idConvocatoria);
        validarEstado(conv, "EN_ELABORACION", "registrar cronograma");
        validarReglasCronograma(request);                                               
        // Eliminar cronograma anterior si existe (reemplazar)
        cronoRepo.deleteByConvocatoriaId(idConvocatoria);

        List<Cronograma> actividades = new ArrayList<>();
        for (CronogramaRequest.ActividadItem item : request.getActividades()) {
            // Validar CK_CRONO_FECHAS
            if (item.getFechaFin().isBefore(item.getFechaInicio())) {
                throw new DomainException("Fecha fin no puede ser anterior a fecha inicio en actividad: " + item.getActividad());
            }

            actividades.add(Cronograma.builder()
                    .convocatoria(conv)
                    .etapa(etapaToDb(normalizarEtapa(item.getEtapa())))
                    .actividad(item.getActividad())
                    .fechaInicio(item.getFechaInicio())
                    .fechaFin(item.getFechaFin())
                    .responsable(item.getResponsable())
                    .lugar(item.getLugar())
                    .orden(item.getOrden())
                    .usuarioCreacion(username)
                    .build());
        }

        cronoRepo.saveAll(actividades);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_CRONOGRAMA", idConvocatoria,
                "REGISTRAR_CRONOGRAMA", null, null, httpReq);

        notificacionService.notificarRoles(
                List.of("ORH", "COMITE"),
                conv,
                "Cronograma registrado",
                "El cronograma de la convocatoria " + conv.getNumeroConvocatoria()
                        + " fue registrado y quedó disponible para seguimiento interno.",
                username
        );

        return CronogramaResponse.builder()
                .idConvocatoria(idConvocatoria)
                .actividadesRegistradas(actividades.size())
                .mensaje("Cronograma registrado exitosamente")
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    // E11 — Registrar comité de selección
    // ══════════════════════════════════════════════════════════════

    /**
     * E11: POST /convocatorias/{id}/comite — CU-07.
     * Registra comité con resolución y miembros (mínimo 3).
     * TODO: Notificación a miembros (PKG-06 transversal).
     */
    @Transactional
    public ComiteResponse registrarComite(Long idConvocatoria, ComiteRequest request,
                                           String username, HttpServletRequest httpReq) {
        Convocatoria conv = buscarConvocatoria(idConvocatoria);
        validarEstado(conv, "EN_ELABORACION", "registrar comité");

        if (comiteRepo.existsByConvocatoriaId(idConvocatoria)) {
            throw new DomainException("Ya existe un comité registrado para esta convocatoria");
        }

        // Validar que haya un PRESIDENTE
        boolean tienePresidente = request.getMiembros().stream()
                .anyMatch(m -> "PRESIDENTE".equals(m.getRolComite()));
        if (!tienePresidente) {
            throw new DomainException("El comité debe tener al menos un miembro con rol PRESIDENTE");
        }

        ComiteSeleccion comite = ComiteSeleccion.builder()
                .convocatoria(conv)
                .numeroResolucion(request.getNumeroResolucion())
                .fechaDesignacion(request.getFechaDesignacion())
                .usuarioCreacion(username)
                .build();

        List<MiembroComite> miembros = new ArrayList<>();
        for (ComiteRequest.MiembroItem item : request.getMiembros()) {
            miembros.add(MiembroComite.builder()
                    .comite(comite)
                    .idUsuario(item.getIdUsuario())
                    .nombresCompletos(item.getNombresCompletos())
                    .cargo(item.getCargo())
                    .rolComite(item.getRolComite())
                    .esTitular(item.getEsTitular() != null ? item.getEsTitular() : true)
                    .build());
        }
        comite.setMiembros(miembros);
        comite = comiteRepo.save(comite);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_COMITE_SELECCION", comite.getIdComite(),
                "REGISTRAR_COMITE", null, null, httpReq);

            notificacionService.notificarRoles(
                     List.of("ORH", "COMITE"),
                    conv,
                    "Registro de comité de selección",
                    "Se registró el comité de selección de la convocatoria " + conv.getNumeroConvocatoria()
                            + ". Revise su participación en el proceso.",
                    username
            );
            int notificaciones = miembros.size();

        return ComiteResponse.builder()
                .idComite(comite.getIdComite())
                .idConvocatoria(idConvocatoria)
                .miembrosRegistrados(miembros.size())
                .notificacionesEnviadas(notificaciones)
                .mensaje("Comité registrado y miembros notificados")
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    // POST /convocatorias/{id}/comite/notificar — ORH notifica a COMITE
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public void notificarComiteConformado(Long idConvocatoria, String username, HttpServletRequest httpReq) {
        Convocatoria conv = buscarConvocatoria(idConvocatoria);
        validarEstado(conv, "EN_ELABORACION", "notificar comité");

        ComiteSeleccion comite = comiteRepo.findByConvocatoriaId(idConvocatoria)
                .orElseThrow(() -> new ResourceNotFoundException("Comité", idConvocatoria));

        if ("COMITE_CONFORMADO".equals(comite.getEstado())) {
            throw new DomainException("El comité ya fue notificado y está conformado.");
        }

        comite.setEstado("COMITE_CONFORMADO");
        comiteRepo.save(comite);

        String asunto = "COMITE REGISTRADO";
        String contenido = "El comité de la convocatoria " + conv.getNumeroConvocatoria()
                + " fue registrado y queda pendiente la elaboración de factores y generación del acta de instalación.";

        notificacionService.notificarRol("COMITE", conv, asunto, contenido, username);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_COMITE_SELECCION", comite.getIdComite(),
                "NOTIFICAR_COMITE_CONFORMADO", "ACTIVO", "COMITE_CONFORMADO", httpReq);
    }

    // ══════════════════════════════════════════════════════════════
    // GET /convocatorias/{id}/comite — Obtener comité con miembros
    // ══════════════════════════════════════════════════════════════

    public ComiteDetalleResponse obtenerComite(Long idConvocatoria) {
        Convocatoria conv = buscarConvocatoria(idConvocatoria);
        ComiteSeleccion comite = comiteRepo.findByConvocatoriaId(idConvocatoria)
                .orElseThrow(() -> new ResourceNotFoundException("Comité", idConvocatoria));
        return mapComiteDetalle(comite, conv);
    }

    // ══════════════════════════════════════════════════════════════
    // POST /convocatorias/{id}/comite/miembros — Agregar miembro
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public ComiteDetalleResponse.MiembroItem agregarMiembro(
            Long idConvocatoria, MiembroComiteRequest request,
            String username, HttpServletRequest httpReq) {
        buscarConvocatoria(idConvocatoria);
        ComiteSeleccion comite = comiteRepo.findByConvocatoriaId(idConvocatoria)
                .orElseThrow(() -> new DomainException("No existe comité. Primero registre el comité (E11)."));

        MiembroComite miembro = MiembroComite.builder()
                .comite(comite)
                .nombresCompletos(request.getNombresCompletos())
                .cargo(request.getCargo())
                .rolComite(request.getRolComite())
                .esTitular(request.getEsTitular() != null ? request.getEsTitular() : true)
                .build();
        miembro = miembroJpaRepo.save(miembro);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_MIEMBRO_COMITE", miembro.getIdMiembroComite(),
                "AGREGAR_MIEMBRO", null, null, httpReq);

        return ComiteDetalleResponse.MiembroItem.builder()
                .idMiembroComite(miembro.getIdMiembroComite())
                .nombresCompletos(miembro.getNombresCompletos())
                .cargo(miembro.getCargo())
                .rolComite(miembro.getRolComite())
                .esTitular(miembro.getEsTitular())
                .estado(miembro.getEstado())
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    // PUT /convocatorias/{id}/comite/miembros/{idMiembro} — Editar
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public ComiteDetalleResponse.MiembroItem actualizarMiembro(
            Long idConvocatoria, Long idMiembro, MiembroComiteRequest request,
            String username, HttpServletRequest httpReq) {
        buscarConvocatoria(idConvocatoria);
        MiembroComite miembro = miembroJpaRepo.findById(idMiembro)
                .orElseThrow(() -> new ResourceNotFoundException("Miembro", idMiembro));

        miembro.setNombresCompletos(request.getNombresCompletos());
        miembro.setCargo(request.getCargo());
        miembro.setRolComite(request.getRolComite());
        if (request.getEsTitular() != null) miembro.setEsTitular(request.getEsTitular());
        miembro = miembroJpaRepo.save(miembro);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_MIEMBRO_COMITE", idMiembro,
                "ACTUALIZAR_MIEMBRO", null, null, httpReq);

        return ComiteDetalleResponse.MiembroItem.builder()
                .idMiembroComite(miembro.getIdMiembroComite())
                .nombresCompletos(miembro.getNombresCompletos())
                .cargo(miembro.getCargo())
                .rolComite(miembro.getRolComite())
                .esTitular(miembro.getEsTitular())
                .estado(miembro.getEstado())
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    // DELETE /convocatorias/{id}/comite/miembros/{idMiembro}
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public void eliminarMiembro(Long idConvocatoria, Long idMiembro,
                                 String username, HttpServletRequest httpReq) {
        buscarConvocatoria(idConvocatoria);
        MiembroComite miembro = miembroJpaRepo.findById(idMiembro)
                .orElseThrow(() -> new ResourceNotFoundException("Miembro", idMiembro));
        miembroJpaRepo.delete(miembro);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_MIEMBRO_COMITE", idMiembro,
                "ELIMINAR_MIEMBRO", null, null, httpReq);
    }

    // ── Helper para mapear comité a DTO ──
    private ComiteDetalleResponse mapComiteDetalle(ComiteSeleccion comite, Convocatoria conv) {
        List<ComiteDetalleResponse.MiembroItem> miembros = comite.getMiembros().stream()
                .map(m -> ComiteDetalleResponse.MiembroItem.builder()
                        .idMiembroComite(m.getIdMiembroComite())
                        .nombresCompletos(m.getNombresCompletos())
                        .cargo(m.getCargo())
                        .rolComite(m.getRolComite())
                        .esTitular(m.getEsTitular())
                        .estado(m.getEstado())
                        .build())
                .toList();
        return ComiteDetalleResponse.builder()
                .idComite(comite.getIdComite())
                .idConvocatoria(conv.getIdConvocatoria())
                .numeroConvocatoria(conv.getNumeroConvocatoria())
                .numeroResolucion(comite.getNumeroResolucion())
                .fechaDesignacion(comite.getFechaDesignacion() != null
                        ? comite.getFechaDesignacion().toString() : null)
                .estado(comite.getEstado())
                .miembros(miembros)
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    // E12 — Registrar factores de evaluación
    // ══════════════════════════════════════════════════════════════

    /**
     * E12: POST /convocatorias/{id}/factores — CU-08.
     * Comité define factores por etapa con puntajes, pesos y orden.
     * Alimenta Motor RF-14 para Etapa 3.
     */
    @Transactional
    public FactorEvaluacionResponse registrarFactores(Long idConvocatoria,
                                                       FactorEvaluacionRequest request,
                                                       String username, HttpServletRequest httpReq) {
        Convocatoria conv = buscarConvocatoria(idConvocatoria);
        validarEstado(conv, "EN_ELABORACION", "registrar factores");

        // Eliminar factores anteriores (reemplazar)
        factorRepo.deleteByConvocatoriaId(idConvocatoria);

        List<FactorEvaluacion> factores = new ArrayList<>();
        for (FactorEvaluacionRequest.FactorItem item : request.getFactores()) {
            // Validar CK_FACTOR_PUNTAJE
            BigDecimal min = item.getPuntajeMinimo() != null ? item.getPuntajeMinimo() : BigDecimal.ZERO;
            if (item.getPuntajeMaximo().compareTo(min) < 0) {
                throw new DomainException("Puntaje máximo no puede ser menor al mínimo en criterio: " + item.getCriterio());
            }

            factores.add(FactorEvaluacion.builder()
                    .convocatoria(conv)
                    .etapaEvaluacion(item.getEtapaEvaluacion())
                    .criterio(item.getCriterio())
                    .puntajeMaximo(item.getPuntajeMaximo())
                    .puntajeMinimo(min)
                    .pesoCriterio(item.getPesoCriterio())
                    .orden(item.getOrden())
                    .descripcion(item.getDescripcion())
                    .usuarioCreacion(username)
                    .build());
        }

        factorRepo.saveAll(factores);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_FACTOR_EVALUACION", idConvocatoria,
                "REGISTRAR_FACTORES", null, null, httpReq);

        notificacionService.notificarRoles(
                    List.of("ORH", "COMITE"),
                    conv,
                    "Factores de evaluación configurados",
                    "La convocatoria " + conv.getNumeroConvocatoria()
                            + " ya cuenta con factores de evaluación registrados.",
                    username
            );

        return FactorEvaluacionResponse.builder()
                .idConvocatoria(idConvocatoria)
                .factoresRegistrados(factores.size())
                .mensaje("Factores de evaluación configurados")
                .build();
    }

    private static final int MAX_FACTORES = 3;

    /**
     * GET /convocatorias/{id}/factores — Listar fases con subcriterios.
     */
    public List<FactorDetalleResponse> listarFactores(Long idConvocatoria) {
        buscarConvocatoria(idConvocatoria);
        List<FactorEvaluacion> fases = factorRepo.findByConvocatoriaIdSoloFases(idConvocatoria);
        return fases.stream().map(f -> mapFactorDetalleConSubcriterios(f)).toList();
    }

    /**
     * POST /convocatorias/{id}/factores — Agregar fase o subcriterio.
     * Máx. 3 fases principales. Subcriterios ilimitados por fase.
     */
    @Transactional
    public FactorDetalleResponse agregarFactor(Long idConvocatoria, FactorFactorRequest request,
                                               String username, HttpServletRequest httpReq) {
        Convocatoria conv = buscarConvocatoria(idConvocatoria);
        validarEstado(conv, "EN_ELABORACION", "agregar factor");

        BigDecimal min = request.getPuntajeMinimo() != null ? request.getPuntajeMinimo() : BigDecimal.ZERO;
        if (request.getPuntajeMaximo().compareTo(min) < 0) {
            throw new DomainException("Puntaje máximo no puede ser menor al mínimo.");
        }

        FactorEvaluacion factorPadre = null;
        int orden = 1;

        if (request.getIdFactorPadre() != null) {
            factorPadre = factorRepo.findById(request.getIdFactorPadre())
                    .orElseThrow(() -> new ResourceNotFoundException("Factor padre", request.getIdFactorPadre()));
            if (!factorPadre.getConvocatoria().getIdConvocatoria().equals(idConvocatoria)) {
                throw new ResourceNotFoundException("Factor padre", request.getIdFactorPadre());
            }
            List<FactorEvaluacion> subcriterios = factorRepo.findByFactorPadreId(request.getIdFactorPadre());
            orden = subcriterios.size() + 1;
        } else {
            List<FactorEvaluacion> fases = factorRepo.findByConvocatoriaIdSoloFases(idConvocatoria);
            if (fases.size() >= MAX_FACTORES) {
                throw new DomainException("Solo se permiten " + MAX_FACTORES + " fases por convocatoria.");
            }
            orden = fases.size() + 1;
        }

        FactorEvaluacion factor = FactorEvaluacion.builder()
                .convocatoria(conv)
                .factorPadre(factorPadre)
                .etapaEvaluacion(request.getEtapaEvaluacion())
                .criterio(request.getCriterio())
                .puntajeMaximo(request.getPuntajeMaximo())
                .puntajeMinimo(min)
                .pesoCriterio(request.getPesoCriterio())
                .orden(request.getOrden() != null ? request.getOrden() : orden)
                .descripcion(request.getDescripcion())
                .usuarioCreacion(username)
                .build();
        factor = factorRepo.save(factor);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_FACTOR_EVALUACION", factor.getIdFactor(),
                "AGREGAR_FACTOR", null, null, httpReq);

        return mapFactorDetalle(factor);
    }

    /**
     * PUT /convocatorias/{id}/factores/{idFactor} — Actualizar factor.
     */
    @Transactional
    public FactorDetalleResponse actualizarFactor(Long idConvocatoria, Long idFactor,
                                                   FactorFactorRequest request,
                                                   String username, HttpServletRequest httpReq) {
        buscarConvocatoria(idConvocatoria);
        FactorEvaluacion factor = factorRepo.findById(idFactor)
                .orElseThrow(() -> new ResourceNotFoundException("Factor", idFactor));
        if (!factor.getConvocatoria().getIdConvocatoria().equals(idConvocatoria)) {
            throw new ResourceNotFoundException("Factor", idFactor);
        }

        BigDecimal min = request.getPuntajeMinimo() != null ? request.getPuntajeMinimo() : BigDecimal.ZERO;
        if (request.getPuntajeMaximo().compareTo(min) < 0) {
            throw new DomainException("Puntaje máximo no puede ser menor al mínimo.");
        }

        factor.setEtapaEvaluacion(request.getEtapaEvaluacion());
        factor.setCriterio(request.getCriterio());
        factor.setPuntajeMaximo(request.getPuntajeMaximo());
        factor.setPuntajeMinimo(min);
        factor.setPesoCriterio(request.getPesoCriterio());
        if (request.getOrden() != null) factor.setOrden(request.getOrden());
        factor.setDescripcion(request.getDescripcion());
        factor = factorRepo.save(factor);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_FACTOR_EVALUACION", idFactor,
                "ACTUALIZAR_FACTOR", null, null, httpReq);

        return mapFactorDetalle(factor);
    }

    /**
     * DELETE /convocatorias/{id}/factores/{idFactor} — Eliminar factor.
     */
    @Transactional
    public void eliminarFactor(Long idConvocatoria, Long idFactor,
                                String username, HttpServletRequest httpReq) {
        buscarConvocatoria(idConvocatoria);
        FactorEvaluacion factor = factorRepo.findById(idFactor)
                .orElseThrow(() -> new ResourceNotFoundException("Factor", idFactor));
        if (!factor.getConvocatoria().getIdConvocatoria().equals(idConvocatoria)) {
            throw new ResourceNotFoundException("Factor", idFactor);
        }
        factorRepo.deleteById(idFactor);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_FACTOR_EVALUACION", idFactor,
                "ELIMINAR_FACTOR", null, null, httpReq);
    }

    private FactorDetalleResponse mapFactorDetalle(FactorEvaluacion f) {
        return FactorDetalleResponse.builder()
                .idFactor(f.getIdFactor())
                .idConvocatoria(f.getConvocatoria() != null ? f.getConvocatoria().getIdConvocatoria() : null)
                .idFactorPadre(f.getFactorPadre() != null ? f.getFactorPadre().getIdFactor() : null)
                .etapaEvaluacion(f.getEtapaEvaluacion())
                .criterio(f.getCriterio())
                .puntajeMaximo(f.getPuntajeMaximo())
                .puntajeMinimo(f.getPuntajeMinimo())
                .pesoCriterio(f.getPesoCriterio())
                .orden(f.getOrden())
                .descripcion(f.getDescripcion())
                .estado(f.getEstado())
                .subcriterios(null)
                .build();
    }

    private FactorDetalleResponse mapFactorDetalleConSubcriterios(FactorEvaluacion f) {
        List<FactorDetalleResponse> subcriteriosList = f.getSubcriterios() != null && !f.getSubcriterios().isEmpty()
                ? f.getSubcriterios().stream().map(this::mapFactorDetalle).toList()
                : factorRepo.findByFactorPadreId(f.getIdFactor()).stream().map(this::mapFactorDetalle).toList();
        return FactorDetalleResponse.builder()
                .idFactor(f.getIdFactor())
                .idConvocatoria(f.getConvocatoria() != null ? f.getConvocatoria().getIdConvocatoria() : null)
                .idFactorPadre(null)
                .etapaEvaluacion(f.getEtapaEvaluacion())
                .criterio(f.getCriterio())
                .puntajeMaximo(f.getPuntajeMaximo())
                .puntajeMinimo(f.getPuntajeMinimo())
                .pesoCriterio(f.getPesoCriterio())
                .orden(f.getOrden())
                .descripcion(f.getDescripcion())
                .estado(f.getEstado())
                .subcriterios(subcriteriosList)
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    // E13 — Generar Acta de Instalación
    // ══════════════════════════════════════════════════════════════

    /**
     * E13: POST /convocatorias/{id}/acta-instalacion — CU-09.
     * Sistema genera Acta PDF con datos del comité.
     * Nota: JasperReports diferido — genera texto placeholder.
     */
    @Transactional
    public ActaResponse generarActaInstalacion(Long idConvocatoria, String username,
                                                HttpServletRequest httpReq) {
        Convocatoria conv = buscarConvocatoria(idConvocatoria);
        validarEstado(conv, "EN_ELABORACION", "generar acta de instalación");

        // Validar que exista comité
        if (!comiteRepo.existsByConvocatoriaId(idConvocatoria)) {
            throw new DomainException("Debe registrar el comité antes de generar el acta de instalación");
        }

        // Verificar si ya existe un acta de instalación
        actaRepo.findByConvocatoriaIdAndTipoActa(idConvocatoria, "INSTALACION")
                .ifPresent(a -> {
                    throw new DomainException("Ya existe un acta de instalación para esta convocatoria (ID=" + a.getIdActa() + ")");
                });

        String numeroActa = "ACTA-INST-" + conv.getNumeroConvocatoria();
        String rutaPdf = "/actas/" + numeroActa + ".pdf";

        Acta acta = Acta.builder()
                .convocatoria(conv)
                .tipoActa("INSTALACION")
                .numeroActa(numeroActa)
                .fechaActa(LocalDate.now())
                .rutaArchivoPdf(rutaPdf)
                .estado("GENERADA")
                .usuarioCreacion(username)
                .build();

        acta = actaRepo.save(acta);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_ACTA", acta.getIdActa(),
                "GENERAR_ACTA", null, "GENERADA", httpReq);


        notificacionService.notificarRoles(
                    List.of("ORH", "COMITE"),
                    conv,
                    "Acta de instalación generada",
                    "El acta de instalación de la convocatoria " + conv.getNumeroConvocatoria()
                            + " fue generada y está pendiente de firma.",
                    username
            );

        ActaResponse response = mapper.toActaResponse(acta);
        response.setMensaje("Acta generada. Pendiente de firma.");
        return response;
    }

    // ══════════════════════════════════════════════════════════════
    // E14 — Cargar Acta firmada
    // ══════════════════════════════════════════════════════════════

    /**
     * E14: PUT /convocatorias/{id}/acta-instalacion/cargar — CU-09.
     * Recibe multipart/form-data con PDF firmado escaneado.
     * Nota: Almacenamiento de archivo diferido — registra ruta.
     */
    @Transactional
    public ActaResponse cargarActaFirmada(Long idConvocatoria, String rutaArchivoFirmado,
                                           LocalDate fechaFirma, String username,
                                           HttpServletRequest httpReq) {
        buscarConvocatoria(idConvocatoria);

        Acta acta = actaRepo.findByConvocatoriaIdAndTipoActa(idConvocatoria, "INSTALACION")
                .orElseThrow(() -> new DomainException("No existe acta de instalación. Primero genere el acta (E13)"));

        if ("FIRMADA".equals(acta.getEstado())) {
            throw new DomainException("El acta ya fue cargada como firmada");
        }

        String estadoAnterior = acta.getEstado();
        acta.setRutaArchivoFirmado(rutaArchivoFirmado);
        acta.setFirmada(true);
        acta.setFechaCargaFirma(fechaFirma != null ? fechaFirma : LocalDate.now());
        acta.setEstado("FIRMADA");

        acta = actaRepo.save(acta);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_ACTA", acta.getIdActa(),
                "CARGAR_ACTA_FIRMADA", estadoAnterior, "FIRMADA", httpReq);


          notificacionService.notificarRoles(
                    List.of("ORH", "COMITE"),
                    acta.getConvocatoria(),
                    "Acta firmada cargada",
                    "El acta de instalación de la convocatoria " + acta.getConvocatoria().getNumeroConvocatoria()
                            + " fue cargada como FIRMADA.",
                    username
            );

        ActaResponse response = mapper.toActaResponse(acta);
        response.setMensaje("Acta firmada cargada exitosamente");
        return response;
    }

    // ══════════════════════════════════════════════════════════════
    // E15 — Aprobar y publicar convocatoria
    // ══════════════════════════════════════════════════════════════

    /**
     * E15: PUT /convocatorias/{id}/aprobar — CU-10.
     * Publicación SIMULTÁNEA en Portal ACFFAA y Talento Perú (D.S. 065-2011-PCM).
     * Mínimo 10 días hábiles.
     */
    @Transactional
    public ConvocatoriaResponse aprobar(Long idConvocatoria, AprobarConvocatoriaRequest request,
                                         String username, Long idUsuario,
                                         HttpServletRequest httpReq) {
        Convocatoria conv = buscarConvocatoria(idConvocatoria);
        validarEstado(conv, "EN_ELABORACION", "aprobar convocatoria");

        if (!Boolean.TRUE.equals(request.getAprobada())) {
            throw new DomainException("El campo 'aprobada' debe ser true para aprobar la convocatoria");
        }

        // Validar que exista acta firmada
        Acta acta = actaRepo.findByConvocatoriaIdAndTipoActa(idConvocatoria, "INSTALACION")
                .orElseThrow(() -> new DomainException("Se requiere acta de instalación antes de aprobar"));
        if (!Boolean.TRUE.equals(acta.getFirmada())) {
            throw new DomainException("El acta de instalación debe estar firmada antes de aprobar");
        }

        // Validar que existan factores
        List<FactorEvaluacion> factores = factorRepo.findByConvocatoriaId(idConvocatoria);
        if (factores.isEmpty()) {
            throw new DomainException("Se requieren factores de evaluación registrados antes de aprobar");
        }

        String estadoAnterior = conv.getEstado();
        conv.setEstado("PUBLICADA");
        conv.setLinkPortalAcffaa(request.getLinkPortalAcffaa());
        conv.setLinkTalentoPeru(request.getLinkTalentoPeru());
        if (conv.getFechaPublicacion() == null) {
            conv.setFechaPublicacion(LocalDate.now());
        }
        conv.setUsuarioModificacion(username);

        conv = convRepo.save(conv);

        auditPort.registrarConvocatoria(idConvocatoria,
                "TBL_CONVOCATORIA", conv.getIdConvocatoria(),
                "APROBAR_PUBLICAR", estadoAnterior, "PUBLICADA", httpReq);


            notificacionService.notificarRoles(
                    List.of("ORH", "COMITE"),
                    conv,
                    "Convocatoria publicada",
                    "La convocatoria " + conv.getNumeroConvocatoria()
                            + " fue aprobada y publicada en los portales institucionales.",
                    username
            );
            if (conv.getRequerimiento() != null && conv.getRequerimiento().getIdUsuarioSolicitante() != null) {
                notificacionService.notificarUsuario(
                        conv.getRequerimiento().getIdUsuarioSolicitante(),
                        conv,
                        "Convocatoria publicada",
                        "La convocatoria " + conv.getNumeroConvocatoria()
                                + " asociada a su requerimiento ya fue publicada.",
                        username
                );
            }

        ConvocatoriaResponse response = mapper.toResponse(conv);
        response.setMensaje("Publicada simultáneamente (D.S. 065-2011-PCM)");
        return response;
    }

    // ══════════════════════════════════════════════════════════════
    // E16 — Generar bases PDF
    // ══════════════════════════════════════════════════════════════

    /**
     * E16: GET /convocatorias/{id}/bases-pdf — CU-11.
     * Genera bases PDF con perfil, requisitos, cronograma, factores, pesos, bases legales.
     * Nota: JasperReports diferido — genera texto placeholder como E5.
     */
    public byte[] generarBasesPdf(Long idConvocatoria) {
        Convocatoria conv = buscarConvocatoria(idConvocatoria);
        PerfilPuesto perfil = conv.getRequerimiento() != null
                ? conv.getRequerimiento().getPerfilPuesto() : null;
        if (perfil == null) {
            throw new DomainException("Convocatoria sin perfil de puesto asociado");
        }
        List<Cronograma> cronograma = cronoRepo.findByConvocatoriaId(idConvocatoria);
        List<FactorEvaluacion> factores = factorRepo.findByConvocatoriaId(idConvocatoria);
        return basesPdfGenerator.generar(conv, perfil, cronograma, factores);
    }

    // ══════════════════════════════════════════════════════════════
    // UTILIDADES PRIVADAS
    // ══════════════════════════════════════════════════════════════

    private String formatCasNumero(long correlativo, int anio) {
        return String.format("CAS-%03d-%d", correlativo, anio);
    }

    private Convocatoria buscarConvocatoria(Long id) {
        return convRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", id));
    }

    private void validarEstado(Convocatoria conv, String estadoRequerido, String operacion) {
        if (!estadoRequerido.equals(conv.getEstado())) {
            String msg = String.format("No se puede %s. Estado actual: %s. Requerido: %s",
                    operacion, conv.getEstado(), estadoRequerido);
            throw new DomainException(msg);
        }
    }




    private void validarReglasCronograma(CronogramaRequest request) {
        if (request == null || request.getActividades() == null || request.getActividades().isEmpty()) {
                throw new DomainException("Debe registrar al menos una actividad en el cronograma.");
            }
        
        Map<String, LocalDate[]> rangosPorEtapa = consolidarRangosPorEtapa(request.getActividades());
    
        LocalDate[] rangoPostulacion = rangosPorEtapa.get("POSTULACION");
        if (rangoPostulacion == null) {
            throw new DomainException("El cronograma debe incluir la etapa de Postulación.");
        }
    
        int diasHabilesPostulacion = calcularDiasHabiles(rangoPostulacion[0], rangoPostulacion[1]);
        if (diasHabilesPostulacion < 10) {
            throw new DomainException("La etapa de Postulación debe contemplar al menos 10 días hábiles estimados (D.S. 065-2011-PCM).");
        }
    
        String etapaAnterior = null;
        LocalDate finAnterior = null;
    
        for (String etapa : ETAPAS_CRONOGRAMA_ORDENADAS) {
            LocalDate[] rangoActual = rangosPorEtapa.get(etapa);
            if (rangoActual == null) {
                continue;
            }
    
            if (etapaAnterior != null && rangoActual[0].isBefore(finAnterior)) {
                throw new DomainException(
                        "La etapa " + etiquetaEtapa(etapa)
                                + " no puede iniciar antes de que finalice la etapa "
                                + etiquetaEtapa(etapaAnterior) + "."
                );
            }
    
            etapaAnterior = etapa;
            finAnterior = rangoActual[1];
        }
    }
    
    private Map<String, LocalDate[]> consolidarRangosPorEtapa(List<CronogramaRequest.ActividadItem> actividades) {
        Map<String, LocalDate[]> rangos = new LinkedHashMap<>();
    
        for (CronogramaRequest.ActividadItem item : actividades) {
            String etapa = normalizarEtapa(item.getEtapa());
    
            if (!ETAPAS_CRONOGRAMA_ORDENADAS.contains(etapa)) {
                throw new DomainException("Etapa de cronograma no válida: " + item.getEtapa());
            }
    
            if (item.getFechaFin().isBefore(item.getFechaInicio())) {
                throw new DomainException("Fecha fin no puede ser anterior a fecha inicio en actividad: " + item.getActividad());
            }
    
            LocalDate[] rangoActual = rangos.get(etapa);
            if (rangoActual == null) {
                rangos.put(etapa, new LocalDate[]{item.getFechaInicio(), item.getFechaFin()});
                continue;
            }

            throw new DomainException("Solo se permite una actividad por etapa. La etapa "
                    + etiquetaEtapa(etapa) + " ya está registrada.");
        }
    
        return rangos;
    }
    
    private String normalizarEtapa(String etapa) {
        return etapa == null ? "" : etapa.trim().toUpperCase();
    }

    private String etapaToDb(String etapaApi) {
        return ETAPA_API_TO_DB.getOrDefault(etapaApi, etapaApi);
    }

    private String etapaFromDb(String etapaDb) {
        return ETAPA_DB_TO_API.getOrDefault(etapaDb, etapaDb);
    }
    
    private int calcularDiasHabiles(LocalDate inicio, LocalDate fin) {
        int dias = 0;
        LocalDate cursor = inicio;
    
        while (!cursor.isAfter(fin)) {
            int dayOfWeek = cursor.getDayOfWeek().getValue();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                dias++;
            }
            cursor = cursor.plusDays(1);
        }
    
        return dias;
    }
    
    private String etiquetaEtapa(String etapa) {
        return ETIQUETAS_ETAPA.getOrDefault(etapa, etapa);
    }
}
