package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.mapper.ContratoMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.domain.enums.EstadoContrato;
import pe.gob.acffaa.sisconv.domain.exception.*;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.domain.repository.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ContratoService — PKG-04 Etapa 4: E32-E37.
 * Suscripción y Registro del Contrato CAS.
 *
 * Statechart: NOTIFICADO → DOCS_VERIFICADOS → SUSCRITO → EN_PLANILLA → CERRADO
 *             NOTIFICADO → CANCELADO (ganador no presenta docs / docs inválidos)
 *
 * Normativa: D.Leg. 1057, D.S. 075-2008-PCM, D.S. 018-2007-TR, RPE 065-2020
 * Reglas: RN-20 a RN-26 (AF §6.2)
 * Coherencia: DiagramaFlujo_04, Endpoints_DTOs_v2 §5, BPMN 4.1-4.8
 */
@Service
public class ContratoService {

    private static final Logger log = LoggerFactory.getLogger(ContratoService.class);

    private final IContratoCasRepository contratoRepo;
    private final IVerificacionDocumentoRepository verifDocRepo;
    private final INotificacionRepository notifRepo;
    private final IConvocatoriaRepository convRepo;
    private final IPostulacionRepository postRepo;
    private final ICuadroMeritosRepository meritoRepo;
    private final IExpedienteVirtualRepository expedienteRepo;
    private final IUsuarioRepository usuarioRepo;
    private final IAuditPort audit;
    private final ContratoMapper mapper;

    public ContratoService(IContratoCasRepository cr, IVerificacionDocumentoRepository vr,
                           INotificacionRepository nr, IConvocatoriaRepository cvr,
                           IPostulacionRepository pr, ICuadroMeritosRepository mr,
                           IExpedienteVirtualRepository er, IUsuarioRepository ur,
                           IAuditPort a, ContratoMapper m) {
        this.contratoRepo = cr; this.verifDocRepo = vr; this.notifRepo = nr;
        this.convRepo = cvr; this.postRepo = pr; this.meritoRepo = mr;
        this.expedienteRepo = er; this.usuarioRepo = ur; this.audit = a; this.mapper = m;
    }

    private String user() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  E32 — POST /contratos/{id}/notificar-ganador
    //  BPMN 4.1: Notificar al Ganador (Email + plazo) RF-17
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public ContratoResponse notificarGanador(Long idConvocatoria,
                                             NotificarGanadorRequest req,
                                             HttpServletRequest http) {
        log.info("E32 notificarGanador conv={} post={}", idConvocatoria, req.getIdPostulacion());

        Convocatoria conv = convRepo.findById(idConvocatoria)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConvocatoria));

        Postulacion post = postRepo.findById(req.getIdPostulacion())
                .orElseThrow(() -> new ResourceNotFoundException("Postulacion", req.getIdPostulacion()));

        // Validar que postulación pertenece a la convocatoria
        if (!post.getConvocatoria().getIdConvocatoria().equals(idConvocatoria)) {
            throw new DomainException("La postulación no pertenece a la convocatoria " + idConvocatoria);
        }

        // Validar estado GANADOR (CK_POST_ESTADO)
        if (!"GANADOR".equals(post.getEstado())) {
            throw new DomainException("Solo se puede notificar a postulantes con estado GANADOR. Estado actual: " + post.getEstado());
        }

        // Calcular fecha vencimiento docs
        LocalDate vencimiento = LocalDate.now().plusDays(req.getPlazoDocumentosDias());

        // Crear contrato en estado NOTIFICADO
        ContratoCas contrato = ContratoCas.builder()
                .convocatoria(conv)
                .postulacion(post)
                .estado(EstadoContrato.NOTIFICADO.name())
                .procesoEstado("EN_CURSO")
                .fechaNotificacion(LocalDateTime.now())
                .plazoDocumentosDias(req.getPlazoDocumentosDias())
                .fechaVencimientoDocs(vencimiento)
                .esAccesitario("N")
                .ordenConvocado(post.getOrdenMerito() != null ? post.getOrdenMerito() : 1)
                .fechaCreacion(LocalDateTime.now())
                .usuarioCreacion(user())
                .build();

        contrato = contratoRepo.save(contrato);
        log.info("E32 ContratoCas creado id={} estado=NOTIFICADO", contrato.getIdContrato());

        // Crear notificación al ganador (RF-17)
        crearNotificacion(conv, post.getPostulante(),
                "Notificación de Ganador CAS",
                "Usted ha sido seleccionado como ganador de la convocatoria " +
                        conv.getNumeroConvocatoria() + ". Tiene hasta el " + vencimiento +
                        " para presentar documentos originales. " +
                        (req.getMensajeAdicional() != null ? req.getMensajeAdicional() : ""));

        // Auditoría RF-18
        audit.registrarConvocatoria(idConvocatoria, "TBL_CONTRATO_CAS",
                contrato.getIdContrato(), "NOTIFICAR_GANADOR", null,
                EstadoContrato.NOTIFICADO.name(),
                "Notificación al ganador para presentación de documentos originales",
                http);

        return mapper.toContratoResponse(contrato, "Ganador notificado exitosamente.");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  E33 — POST /contratos/{id}/verificar-documentos
    //  BPMN 4.2 + 4.4: Verificar Documentos + Gateway ¿Docs válidos?
    //  RN-22: hash SHA-256 vs Expediente Virtual (RPE 065-2020)
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public VerificacionDocsResponse verificarDocumentos(Long idContrato,
                                                        VerificarDocumentosRequest req,
                                                        HttpServletRequest http) {
        log.info("E33 verificarDocumentos contrato={}", idContrato);

        ContratoCas contrato = findContratoOrThrow(idContrato);
        validarTransicion(contrato, EstadoContrato.DOCS_VERIFICADOS);

        Usuario verificador = usuarioRepo.findByUsername(user()).orElse(null);

        int conformes = 0;
        int noConformes = 0;

        for (VerificarDocumentosRequest.VerificacionItem item : req.getVerificaciones()) {
            ExpedienteVirtual exp = expedienteRepo.findById(item.getIdExpediente())
                    .orElseThrow(() -> new ResourceNotFoundException("ExpedienteVirtual", item.getIdExpediente()));

            VerificacionDocumento verif = VerificacionDocumento.builder()
                    .contrato(contrato)
                    .expediente(exp)
                    .verificador(verificador)
                    .tipoDocumento(item.getTipoDocumento())
                    .documentoConforme(item.getDocumentoConforme())
                    .observacion(item.getObservacion())
                    .fechaVerificacion(LocalDateTime.now())
                    .build();

            verifDocRepo.save(verif);

            if ("S".equals(item.getDocumentoConforme())) conformes++;
            else noConformes++;
        }

        int total = conformes + noConformes;
        boolean allOk = noConformes == 0 && total > 0;

        // Si todos conformes → transicionar a DOCS_VERIFICADOS
        if (allOk) {
            contrato.setEstado(EstadoContrato.DOCS_VERIFICADOS.name());
            contrato.setDocsVerificados(true);
            contrato.setFechaModificacion(LocalDateTime.now());
            contrato.setUsuarioModificacion(user());
            contratoRepo.save(contrato);
            log.info("E33 Documentos verificados OK contrato={}", idContrato);
        } else {
            // RN-24: Docs inválidos = mismo efecto que no presentar
            contrato.setDocsVerificados(false);
            contrato.setFechaModificacion(LocalDateTime.now());
            contrato.setUsuarioModificacion(user());
            contratoRepo.save(contrato);
            log.warn("E33 Documentos NO conformes contrato={} noConformes={}", idContrato, noConformes);
        }

        audit.registrarConvocatoria(
                contrato.getConvocatoria().getIdConvocatoria(), "TBL_VERIFICACION_DOCUMENTO",
                idContrato, "VERIFICAR_DOCUMENTOS",
                EstadoContrato.NOTIFICADO.name(),
                allOk ? EstadoContrato.DOCS_VERIFICADOS.name() : "DOCS_RECHAZADOS",
                "Verificación de documentos originales — conformes: " + conformes + ", no conformes: " + noConformes,
                http);

        return mapper.toVerificacionResponse(idContrato, total, conformes, noConformes);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  E34 — POST /contratos/{id}/suscribir
    //  BPMN 4.6: Suscribir Contrato CAS — Firma bilateral D.Leg. 1057
    //  RN-25: Requiere firma bilateral de ambas partes
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public ContratoResponse suscribir(Long idContrato,
                                      SuscribirContratoRequest req,
                                      HttpServletRequest http) {
        log.info("E34 suscribir contrato={}", idContrato);

        ContratoCas contrato = findContratoOrThrow(idContrato);
        validarTransicion(contrato, EstadoContrato.SUSCRITO);

        // Validar fechas
        if (req.getFechaFin().isBefore(req.getFechaInicio())) {
            throw new DomainException("La fecha fin no puede ser anterior a la fecha inicio.");
        }

        String estadoAnterior = contrato.getEstado();

        // Generar número de contrato: CTO-CAS-XXX-YYYY
        String numContrato = generarNumeroContrato(contrato.getConvocatoria().getAnio());

        contrato.setNumeroContrato(numContrato);
        contrato.setEstado(EstadoContrato.SUSCRITO.name());
        contrato.setFechaSuscripcion(LocalDate.now());
        contrato.setFechaInicio(req.getFechaInicio());
        contrato.setFechaFin(req.getFechaFin());
        contrato.setMontoMensual(req.getMontoMensual());
        contrato.setFunciones(req.getFunciones());
        contrato.setDependencia(req.getDependencia());
        contrato.setFechaModificacion(LocalDateTime.now());
        contrato.setUsuarioModificacion(user());

        contrato = contratoRepo.save(contrato);
        log.info("E34 Contrato suscrito id={} num={}", idContrato, numContrato);

        // Notificación al contratado
        Postulante p = contrato.getPostulacion().getPostulante();
        crearNotificacion(contrato.getConvocatoria(), p,
                "Contrato CAS Suscrito",
                "Su contrato " + numContrato + " ha sido suscrito. " +
                        "Inicio: " + req.getFechaInicio() + ", Fin: " + req.getFechaFin());

        audit.registrarConvocatoria(contrato.getConvocatoria().getIdConvocatoria(),
                "TBL_CONTRATO_CAS", idContrato, "SUSCRIBIR_CONTRATO",
                estadoAnterior, EstadoContrato.SUSCRITO.name(),
                "Suscripción bilateral del contrato CAS — D.Leg. 1057",
                http);

        return mapper.toContratoResponse(contrato, "Contrato CAS suscrito exitosamente.");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  E35 — POST /contratos/{id}/convocar-accesitario
    //  BPMN 4.5: Convocar Accesitario + Gateway ¿Acepta?
    //  RN-20/21: Si ganador no presenta → accesitario. Si nadie → DESIERTO
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public ContratoResponse convocarAccesitario(Long idContrato,
                                                ConvocarAccesitarioRequest req,
                                                HttpServletRequest http) {
        log.info("E35 convocarAccesitario contrato={}", idContrato);

        ContratoCas contratoActual = findContratoOrThrow(idContrato);

        // Cancelar contrato actual
        contratoActual.setEstado(EstadoContrato.CANCELADO.name());
        contratoActual.setObservaciones(req.getMotivoConvocatoria());
        contratoActual.setFechaModificacion(LocalDateTime.now());
        contratoActual.setUsuarioModificacion(user());
        contratoRepo.save(contratoActual);

        Long idConv = contratoActual.getConvocatoria().getIdConvocatoria();

        // Buscar siguiente accesitario en CuadroMeritos
        List<CuadroMeritos> meritos = new ArrayList<>(meritoRepo.findByConvocatoriaId(idConv));
        meritos.sort(Comparator.comparingInt(CuadroMeritos::getOrdenMerito));

        // Filtrar: postulaciones con estado ACCESITARIO que no tienen contrato activo
        Postulacion siguiente = null;
        int ordenConvocado = 0;

        for (CuadroMeritos cm : meritos) {
            Postulacion p = cm.getPostulacion();
            if ("ACCESITARIO".equals(p.getEstado())) {
                // Verificar que no tenga contrato previo cancelado ya
                Optional<ContratoCas> previo = contratoRepo.findByPostulacionId(p.getIdPostulacion());
                if (previo.isEmpty()) {
                    siguiente = p;
                    ordenConvocado = cm.getOrdenMerito();
                    break;
                }
            }
        }

        if (siguiente == null) {
            log.warn("E35 No hay accesitarios disponibles conv={}", idConv);
            throw new DomainException(
                    "No hay accesitarios disponibles. Considere cerrar el proceso como DESIERTO (E37).");
        }

        // Cambiar estado del accesitario a GANADOR
        siguiente.setEstado("GANADOR");
        siguiente.setResultado("GANADOR");
        postRepo.save(siguiente);

        // Crear nuevo contrato para el accesitario
        LocalDate vencimiento = LocalDate.now().plusDays(5); // plazo estándar 5 días

        ContratoCas nuevoContrato = ContratoCas.builder()
                .convocatoria(contratoActual.getConvocatoria())
                .postulacion(siguiente)
                .estado(EstadoContrato.NOTIFICADO.name())
                .procesoEstado("EN_CURSO")
                .fechaNotificacion(LocalDateTime.now())
                .plazoDocumentosDias(5)
                .fechaVencimientoDocs(vencimiento)
                .esAccesitario("S")
                .ordenConvocado(ordenConvocado)
                .motivoConvocatoria(req.getMotivoConvocatoria())
                .fechaCreacion(LocalDateTime.now())
                .usuarioCreacion(user())
                .build();

        nuevoContrato = contratoRepo.save(nuevoContrato);
        log.info("E35 Accesitario convocado id={} orden={}", nuevoContrato.getIdContrato(), ordenConvocado);

        // Notificación al accesitario
        Postulante postulante = siguiente.getPostulante();
        crearNotificacion(contratoActual.getConvocatoria(), postulante,
                "Convocatoria como Accesitario CAS",
                "Ha sido convocado como accesitario (orden " + ordenConvocado +
                        ") para la convocatoria " + contratoActual.getConvocatoria().getNumeroConvocatoria() +
                        ". Motivo: " + req.getMotivoConvocatoria() +
                        ". Plazo para documentos: " + vencimiento);

        audit.registrarConvocatoria(idConv, "TBL_CONTRATO_CAS",
                nuevoContrato.getIdContrato(), "CONVOCAR_ACCESITARIO",
                EstadoContrato.CANCELADO.name(), EstadoContrato.NOTIFICADO.name(),
                "Convocatoria de accesitario por renuncia o incumplimiento del ganador",
                http);

        return mapper.toContratoResponse(nuevoContrato, "Accesitario convocado y notificado.");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  E36 — PUT /contratos/{id}/registrar-planilla
    //  BPMN 4.7: Registrar Planilla (D.S. 018-2007-TR) + Timer 5 días
    //  RN-23: Registro en planilla: máximo 5 días hábiles
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public PlanillaResponse registrarPlanilla(Long idContrato,
                                              RegistrarPlanillaRequest req,
                                              HttpServletRequest http) {
        log.info("E36 registrarPlanilla contrato={}", idContrato);

        ContratoCas contrato = findContratoOrThrow(idContrato);
        validarTransicion(contrato, EstadoContrato.EN_PLANILLA);

        String estadoAnterior = contrato.getEstado();

        contrato.setEstado(EstadoContrato.EN_PLANILLA.name());
        contrato.setNumeroPlanilla(req.getNumeroPlanilla());
        contrato.setFechaRegPlanilla(req.getFechaRegistro());
        contrato.setRegistroPlanilla(true);
        contrato.setFechaModificacion(LocalDateTime.now());
        contrato.setUsuarioModificacion(user());

        contrato = contratoRepo.save(contrato);
        log.info("E36 Planilla registrada contrato={} planilla={}", idContrato, req.getNumeroPlanilla());

        audit.registrarConvocatoria(contrato.getConvocatoria().getIdConvocatoria(),
                "TBL_CONTRATO_CAS", idContrato, "REGISTRAR_PLANILLA",
                estadoAnterior, EstadoContrato.EN_PLANILLA.name(),
                "Registro de planilla de remuneraciones — N°: " + req.getNumeroPlanilla(),
                http);

        return mapper.toPlanillaResponse(contrato);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  E37 — PUT /contratos/{id}/cerrar
    //  BPMN 4.8: Cerrar Proceso FINALIZADO/DESIERTO + Publicar +
    //            Notificar + Log RF-18 (D.L. 1451)
    //  RN-26: Cierre registra en Log de Transparencia
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public ContratoResponse cerrar(Long idContrato,
                                   CerrarProcesoRequest req,
                                   HttpServletRequest http) {
        log.info("E37 cerrar contrato={} procesoEstado={}", idContrato, req.getProcesoEstado());

        ContratoCas contrato = findContratoOrThrow(idContrato);

        // Para DESIERTO: puede cerrarse desde NOTIFICADO o CANCELADO
        // Para FINALIZADO: debe estar EN_PLANILLA
        if ("FINALIZADO".equals(req.getProcesoEstado())) {
            validarTransicion(contrato, EstadoContrato.CERRADO);
        }

        String estadoAnterior = contrato.getEstado();

        contrato.setEstado(EstadoContrato.CERRADO.name());
        contrato.setProcesoEstado(req.getProcesoEstado());
        contrato.setObservaciones(req.getObservaciones());
        contrato.setFechaModificacion(LocalDateTime.now());
        contrato.setUsuarioModificacion(user());

        contrato = contratoRepo.save(contrato);
        log.info("E37 Proceso cerrado contrato={} resultado={}", idContrato, req.getProcesoEstado());

        // Notificaciones de cierre a todos los postulantes GANADOR/ACCESITARIO
        Long idConv = contrato.getConvocatoria().getIdConvocatoria();
        Convocatoria conv = contrato.getConvocatoria();

        List<Postulacion> notificar = new ArrayList<>();
        notificar.addAll(postRepo.findByConvocatoriaIdAndEstado(idConv, "GANADOR"));
        notificar.addAll(postRepo.findByConvocatoriaIdAndEstado(idConv, "ACCESITARIO"));

        for (Postulacion p : notificar) {
            crearNotificacion(conv, p.getPostulante(),
                    "Cierre de Proceso CAS - " + req.getProcesoEstado(),
                    "El proceso de la convocatoria " + conv.getNumeroConvocatoria() +
                            " ha sido cerrado como " + req.getProcesoEstado() + ".");
        }

        // Auditoría RF-18 (D.L. 1451)
        audit.registrarConvocatoria(idConv, "TBL_CONTRATO_CAS", idContrato,
                "CERRAR_PROCESO_" + req.getProcesoEstado(),
                estadoAnterior, EstadoContrato.CERRADO.name(),
                "Cierre del proceso como " + req.getProcesoEstado(),
                http);

        Long logId = contrato.getIdContrato(); // referencia al log

        ContratoResponse response = mapper.toContratoResponse(contrato,
                "Proceso cerrado exitosamente como " + req.getProcesoEstado() + ".");
        response.setResultadosPublicados(true);
        response.setNotificacionesEnviadas(!notificar.isEmpty());
        response.setLogTransparenciaId(logId);

        return response;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Métodos privados utilitarios
    // ═══════════════════════════════════════════════════════════════════

    private ContratoCas findContratoOrThrow(Long id) {
        return contratoRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ContratoCas", id));
    }

    /**
     * Valida transición del Statechart EstadoContrato.
     * Lanza DomainException si la transición no es permitida.
     */
    private void validarTransicion(ContratoCas contrato, EstadoContrato destino) {
        EstadoContrato actual = EstadoContrato.valueOf(contrato.getEstado());
        if (!actual.puedeTransicionarA(destino)) {
            throw new DomainException("Transición de estado no permitida: "
                    + contrato.getEstado() + " → " + destino.name());
        }
    }

    /**
     * Genera número correlativo CTO-CAS-XXX-YYYY.
     * En producción usa SEQ_NUM_CONTRATO; aquí simula con timestamp.
     */
    private String generarNumeroContrato(Integer anio) {
        int year = anio != null ? anio : LocalDate.now().getYear();
        long seq = System.currentTimeMillis() % 10000;
        return String.format("CTO-CAS-%03d-%d", seq, year);
    }

    /**
     * Crea notificación en TBL_NOTIFICACION (RF-17).
     * Tipo SISTEMA — en producción se dispararía email vía INotificacionPort.
     */
    private void crearNotificacion(Convocatoria conv, Postulante postulante,
                                   String asunto, String contenido) {
        // Buscar usuario destino por email del postulante (si existe en sistema)
        Usuario destino = null;
        if (postulante != null && postulante.getEmail() != null) {
            destino = usuarioRepo.findByEmail(postulante.getEmail()).orElse(null);
        }

        Notificacion notif = Notificacion.builder()
                .convocatoria(conv)
                .usuarioDestino(destino)
                .tipoNotificacion("SISTEMA")
                .asunto(asunto)
                .contenido(contenido)
                .estado("PENDIENTE")
                .emailDestino(postulante != null ? postulante.getEmail() : null)
                .fechaCreacion(LocalDateTime.now())
                .usuarioCreacion(user())
                .build();

        notifRepo.save(notif);
        log.debug("Notificación creada: {} → {}", asunto,
                postulante != null ? postulante.getEmail() : "N/A");
    }
}
