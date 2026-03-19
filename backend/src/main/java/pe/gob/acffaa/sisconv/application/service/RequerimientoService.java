package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import pe.gob.acffaa.sisconv.application.dto.request.ConfigurarReglasRequest;
import pe.gob.acffaa.sisconv.application.dto.request.RequerimientoRequest;
import pe.gob.acffaa.sisconv.application.dto.request.VerificarPresupuestoRequest;
import pe.gob.acffaa.sisconv.application.dto.response.RequerimientoResponse;
import pe.gob.acffaa.sisconv.application.mapper.RequerimientoMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.domain.enums.EstadoRequerimiento;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.PerfilPuesto;
import pe.gob.acffaa.sisconv.domain.model.ReglaMotor;
import pe.gob.acffaa.sisconv.domain.model.Requerimiento;
import pe.gob.acffaa.sisconv.domain.repository.IConvocatoriaRepository;
import pe.gob.acffaa.sisconv.domain.repository.IPerfilPuestoRepository;
import pe.gob.acffaa.sisconv.domain.repository.IReglaMotorRepository;
import pe.gob.acffaa.sisconv.domain.repository.IRequerimientoRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Servicio de gestión de Requerimientos de Personal CAS — CU-03, CU-04, CU-05.
 *
 * Flujo BPMN Etapa 1:
 *   E6: Área Solicitante crea → ELABORADO
 *   E7: OPP verifica presupuesto → CON_PRESUPUESTO | SIN_PRESUPUESTO
 *   E8: ORH configura Motor RF-14 → CONFIGURADO (Conformidad, listo para Etapa 2)
 *
 * Precondiciones:
 *   CU-03: "Existe perfil APROBADO asociable al requerimiento"
 *   CU-04: "Requerimiento en estado ELABORADO"
 *   CU-05: "Requerimiento con presupuesto aprobado (CON_PRESUPUESTO)"
 *
 * Auditoría: Cada operación registra en TBL_LOG_TRANSPARENCIA (D.L. 1451).
 */
@Service
public class RequerimientoService {

    private final IRequerimientoRepository reqRepo;
    private final IPerfilPuestoRepository perfilRepo;
    private final IReglaMotorRepository reglaRepo;
    private final IConvocatoriaRepository convRepo;
    private final RequerimientoMapper mapper;
    private final IAuditPort auditPort;
    private final NotificacionService notificacionService;

    public RequerimientoService(IRequerimientoRepository reqRepo,
                               IPerfilPuestoRepository perfilRepo,
                               IReglaMotorRepository reglaRepo,
                               IConvocatoriaRepository convRepo,
                               RequerimientoMapper mapper,
                               IAuditPort auditPort,
                               NotificacionService notificacionService) {
        this.reqRepo = reqRepo;
        this.perfilRepo = perfilRepo;
        this.reglaRepo = reglaRepo;
        this.convRepo = convRepo;
        this.mapper = mapper;
        this.auditPort = auditPort;
        this.notificacionService = notificacionService;
    }
    // ══════════════════════════════════════════════════════════════
    // CONSULTAS
    // ══════════════════════════════════════════════════════════════

    /**
     * Listar requerimientos con paginación y filtros opcionales.
     *
     * @param estado Filtro por estado BPMN (null = todos)
     * @param idArea Filtro por área solicitante (null = todas)
     * @param pageable Configuración de paginación
     * @return Página de requerimientos
     */
    public Page<RequerimientoResponse> listar(String estado, Long idArea, Pageable pageable) {
        Page<Requerimiento> page;
        if (estado != null && !estado.isBlank()) {
            page = reqRepo.findByEstado(estado, pageable);
        } else if (idArea != null) {
            page = reqRepo.findByIdAreaSolicitante(idArea, pageable);
        } else {
            page = reqRepo.findAll(pageable);
        }
        return page.map(this::toResponseConReglas);
    }

    /**
     * Cuenta requerimientos ELABORADO pendientes de verificación presupuestal por OPP.
     *
     * @return Cantidad de requerimientos que requieren verificación presupuestal
     */
    public long contarPendientesVerificacionPresupuestal() {
        return reqRepo.countElaboradosPendientesVerificacionPresupuestal();
    }

    /**
     * Cuenta requerimientos CON_PRESUPUESTO pendientes de configurar motor de reglas por ORH.
     *
     * @return Cantidad de requerimientos con presupuesto que requieren configuración de reglas
     */
    public long contarConPresupuestoPendientesReglas() {
        return reqRepo.countByEstado("CON_PRESUPUESTO");
    }

    /**
     * Cuenta requerimientos CONFIGURADO sin convocatoria asociada.
     * Banner informativo ORH: pendientes de crear convocatoria (inicio Etapa 2 — PKG-02).
     *
     * @return Cantidad de requerimientos CONFIGURADO que aún no tienen convocatoria
     */
    public long contarConfiguradosSinConvocatoria() {
        return reqRepo.countConfiguradosSinConvocatoria();
    }

    /**
     * Obtener detalle de un requerimiento por ID.
     *
     * @param id ID del requerimiento
     * @return Requerimiento con datos del perfil y estado presupuestal
     */
    public RequerimientoResponse obtenerPorId(Long id) {
        Requerimiento req = reqRepo.findByIdWithProfileAndCondition(id)
                .orElseThrow(() -> new ResourceNotFoundException("Requerimiento", id));
        return toResponseConReglas(req);
    }

    private RequerimientoResponse toResponseConReglas(Requerimiento req) {
        List<ReglaMotor> reglas = reglaRepo.findByIdRequerimiento(req.getIdRequerimiento());
        RequerimientoResponse response = mapper.toResponseConMotor(req, reglas);
        response.setTieneConvocatoria(convRepo.existsByIdRequerimiento(req.getIdRequerimiento()));
        return response;
    }

    // ══════════════════════════════════════════════════════════════
    // E6: CREAR REQUERIMIENTO — CU-03
    // ══════════════════════════════════════════════════════════════

    /**
     * E6: Crear nuevo requerimiento de contratación CAS.
     *
     * Flujo CU-03:
     *   1. Selecciona perfil APROBADO
     *   2. Registra justificación y cantidad de puestos
     *   3. Sistema genera número automático (SEQ_NUM_REQUERIMIENTO)
     *   4. Estado inicial: ELABORADO
     *
     * @param request    DTO con datos del requerimiento (E6 Request)
     * @param username   Usuario autenticado (Área Solicitante)
     * @param idUsuario  ID del usuario autenticado (del JWT)
     * @param httpReq    Request HTTP para auditoría
     * @return Requerimiento creado con estado ELABORADO
     * @throws DomainException si el perfil no está APROBADO
     */
    @Transactional
    public RequerimientoResponse crear(RequerimientoRequest request, String username,
                                       Long idUsuario, HttpServletRequest httpReq) {
        // 1. Validar que el perfil de puesto existe
        PerfilPuesto perfil = perfilRepo.findById(request.getIdPerfilPuesto())
                .orElseThrow(() -> new ResourceNotFoundException("PerfilPuesto", request.getIdPerfilPuesto()));

        // 2. Validar que el perfil esté APROBADO (CU-03 precondición)
        if (!"APROBADO".equals(perfil.getEstado())) {
            throw new DomainException(
                    "El perfil debe estar en estado APROBADO para crear un requerimiento. "
                    + "Estado actual: " + perfil.getEstado());
        }

        // 3. Generar número correlativo: REQ-2026-0001
        int anioActual = Year.now().getValue();
        long count = reqRepo.countByAnio(anioActual);
        String numero = String.format("REQ-%d-%04d", anioActual, count + 1);

        // 4. Crear requerimiento con estado ELABORADO
        Requerimiento req = Requerimiento.builder()
                .numeroRequerimiento(numero)
                .perfilPuesto(perfil)
                .idAreaSolicitante(request.getIdAreaSolicitante())
                .justificacion(request.getJustificacion())
                .cantidadPuestos(request.getCantidadPuestos())
                .idUsuarioSolicitante(idUsuario)
                .usuarioCreacion(username)
                .build();
        // estado = "ELABORADO" por @Builder.Default

        req = reqRepo.save(req);

        auditPort.registrar("TBL_REQUERIMIENTO", req.getIdRequerimiento(), "CREAR",
                null, "ELABORADO", httpReq,
                "Número: " + numero + ", Perfil: " + perfil.getDenominacionPuesto()
                + ", Puestos: " + request.getCantidadPuestos());

        notificacionService.notificarRol(
                        "OPP",
                        "Nuevo requerimiento pendiente de presupuesto",
                        "El requerimiento " + req.getNumeroRequerimiento()
                                + " asociado al perfil '" + perfil.getDenominacionPuesto()
                                + "' requiere verificación presupuestal.",
                        username
                );

        return mapper.toResponse(req);
    }

    // ══════════════════════════════════════════════════════════════
    // E7: VERIFICAR PRESUPUESTO — CU-04
    // ══════════════════════════════════════════════════════════════

    /**
     * E7: Verificación presupuestal por OPP.
     *
     * Flujo CU-04:
     *   Gateway ¿Existen recursos?
     *     SÍ → Emitir certificación, registrar SIAF → CON_PRESUPUESTO
     *     NO → SIN_PRESUPUESTO (terminal — Evento fin error BPMN)
     *
     * Precondición CU-04: "Requerimiento en estado ELABORADO"
     *
     * @param id         ID del requerimiento
     * @param request    DTO con verificación presupuestal (E7 Request)
     * @param username   Usuario autenticado (OPP)
     * @param idUsuario  ID del usuario OPP (del JWT)
     * @param httpReq    Request HTTP para auditoría
     * @return Requerimiento con estado CON_PRESUPUESTO o SIN_PRESUPUESTO
     */
    @Transactional
    public RequerimientoResponse verificarPresupuesto(Long id, VerificarPresupuestoRequest request,
                                                       String username, Long idUsuario,
                                                       HttpServletRequest httpReq) {
        Requerimiento req = findOrThrow(id);

        // Validar transición: solo desde ELABORADO
        EstadoRequerimiento estadoNuevo = Boolean.TRUE.equals(request.getExistePresupuesto())
                ? EstadoRequerimiento.CON_PRESUPUESTO
                : EstadoRequerimiento.SIN_PRESUPUESTO;
        validarTransicion(req, estadoNuevo);

        String estadoAnterior = req.getEstado();

        if (Boolean.TRUE.equals(request.getExistePresupuesto())) {
            // Gateway SÍ → Emitir certificación + Registrar SIAF
            if (request.getCertificacionPresupuestal() == null
                    || request.getCertificacionPresupuestal().isBlank()) {
                throw new DomainException(
                        "certificacionPresupuestal es obligatorio cuando existePresupuesto=true");
            }
            if (request.getNumeroSiaf() == null || request.getNumeroSiaf().isBlank()) {
                throw new DomainException(
                        "numeroSiaf es obligatorio cuando existePresupuesto=true");
            }

            req.setTienePresupuesto(true);
            req.setCertificacionPresupuestal(request.getCertificacionPresupuestal());
            req.setNumeroSiaf(request.getNumeroSiaf());
            req.setObservacionPresupuestal(request.getObservaciones());
            req.setFechaCertPresupuestal(LocalDate.now());
            req.setIdUsuarioOpp(idUsuario);
            req.setEstado(EstadoRequerimiento.CON_PRESUPUESTO.name());
        } else {
            // Gateway NO → SIN_PRESUPUESTO (terminal)
            req.setTienePresupuesto(false);
            req.setObservacionPresupuestal(request.getObservaciones());
            req.setIdUsuarioOpp(idUsuario);
            req.setEstado(EstadoRequerimiento.SIN_PRESUPUESTO.name());
        }

        req.setUsuarioModificacion(username);
        req = reqRepo.save(req);

        // Auditoría D.L. 1451
        String detalles = Boolean.TRUE.equals(request.getExistePresupuesto())
                ? "Certificación: " + request.getCertificacionPresupuestal()
                  + ", SIAF: " + request.getNumeroSiaf()
                : "Sin presupuesto disponible. " + (request.getObservaciones() != null
                  ? request.getObservaciones() : "");
        auditPort.registrar("TBL_REQUERIMIENTO", req.getIdRequerimiento(),
                "VERIFICAR_PRESUPUESTO", estadoAnterior, req.getEstado(), httpReq, detalles);

                // Notificar a ORH y usuario solicitante
                        String asuntoPresupuesto = Boolean.TRUE.equals(request.getExistePresupuesto())
                                ? "Presupuesto verificado para requerimiento " + req.getNumeroRequerimiento()
                                : "Resultado presupuestal desfavorable para requerimiento " + req.getNumeroRequerimiento();

                String contenidoPresupuesto = Boolean.TRUE.equals(request.getExistePresupuesto())
                                ? "El requerimiento " + req.getNumeroRequerimiento()
                                                + " cuenta con certificación presupuestal y puede continuar el flujo."
                                : "El requerimiento " + req.getNumeroRequerimiento()
                                                + " fue marcado SIN_PRESUPUESTO. Revise observaciones y sustento.";

               notificacionService.notificarRol("ORH", asuntoPresupuesto, contenidoPresupuesto, username);
              //  notificacionService.notificarUsuario(req.getIdUsuarioSolicitante(), asuntoPresupuesto, contenidoPresupuesto, username);

                // Notificar a OPP
        notificacionService.notificarRol(
                        "OPP",
                        "Resultado de verificación presupuestal",
                        "El requerimiento " + req.getNumeroRequerimiento()
                                + " fue " + (Boolean.TRUE.equals(request.getExistePresupuesto()) ? "APROBADO" : "RECHAZADO")
                                + " por OPP.",
                        username
                );
        // Notificar a usuario solicitante
        notificacionService.notificarUsuario(req.getIdUsuarioSolicitante(), asuntoPresupuesto, contenidoPresupuesto, username);

        RequerimientoResponse response = mapper.toResponse(req);
        response.setMensaje(Boolean.TRUE.equals(request.getExistePresupuesto())
                ? "Presupuesto verificado: " + request.getCertificacionPresupuestal()
                : "Sin presupuesto disponible. Proceso finalizado.");
        return response;
    }

    // ══════════════════════════════════════════════════════════════
    // E8: CONFIGURAR MOTOR DE REGLAS RF-14 — CU-05
    // ══════════════════════════════════════════════════════════════

    /**
     * E8: Configurar pesos ponderados y umbrales del Motor de Reglas RF-14.
     *
     * Flujo CU-05:
     *   1. ORH define pesos: Eval. Curricular __%, Eval. Técnica __%, Entrevista __%
     *   2. ORH define umbrales mínimos por etapa
     *   3. ORH registra criterios curriculares detallados
     *   4. Sistema valida que la suma de pesos = 100% (CK_CONV_PESOS)
     *   5. Estado → CONFIGURADO (Conformidad, listo para Etapa 2)
     *
     * Precondición CU-05: "Requerimiento con presupuesto aprobado (CON_PRESUPUESTO)"
     *
     * Crea N reglas en TBL_REGLA_MOTOR:
     *   - 3 reglas CALCULO (peso + umbral por etapa)
     *   - N reglas FILTRO (criterios curriculares)
     *
     * @param id         ID del requerimiento
     * @param request    DTO con pesos, umbrales y criterios (E8 Request)
     * @param username   Usuario autenticado (ORH)
     * @param idUsuario  ID del usuario ORH (del JWT)
     * @param httpReq    Request HTTP para auditoría
     * @return Requerimiento CONFIGURADO con MotorReglasResumen
     */
    @Transactional
    public RequerimientoResponse configurarReglas(Long id, ConfigurarReglasRequest request,
                                                   String username, Long idUsuario,
                                                   HttpServletRequest httpReq) {
        Requerimiento req = findOrThrow(id);

        // Validar transición: solo desde CON_PRESUPUESTO
        validarTransicion(req, EstadoRequerimiento.CONFIGURADO);

        // Validar CK_CONV_PESOS: suma de pesos = 100.00%
        BigDecimal totalPesos = request.getPesoEvalCurricular()
                .add(request.getPesoEvalTecnica())
                .add(request.getPesoEntrevista());
        if (totalPesos.compareTo(new BigDecimal("100.00")) != 0) {
            throw new DomainException(
                    "La suma de pesos debe ser exactamente 100.00%. "
                    + "Actual: " + totalPesos + "% "
                    + "(Curricular=" + request.getPesoEvalCurricular()
                    + " + Técnica=" + request.getPesoEvalTecnica()
                    + " + Entrevista=" + request.getPesoEntrevista() + ")");
        }

        String estadoAnterior = req.getEstado();

        // Eliminar reglas previas (por si se reconfigura antes de aprobar)
        reglaRepo.deleteByIdRequerimiento(id);

        // Crear reglas del motor
        List<ReglaMotor> reglas = new ArrayList<>();

        // 3 reglas CALCULO — pesos y umbrales por etapa
        reglas.add(buildRegla(req, "CALCULO", "Peso Eval. Curricular",
                "CURRICULAR", request.getPesoEvalCurricular(), request.getUmbralCurricular(),
                1, username));
        reglas.add(buildRegla(req, "CALCULO", "Peso Eval. Técnica",
                "TECNICA", request.getPesoEvalTecnica(), request.getUmbralTecnica(),
                2, username));
        reglas.add(buildRegla(req, "CALCULO", "Peso Entrevista",
                "ENTREVISTA", request.getPesoEntrevista(), request.getUmbralEntrevista(),
                3, username));

        // N reglas FILTRO — criterios curriculares detallados
        int prioridad = 10;
        for (ConfigurarReglasRequest.CriterioItem criterio : request.getCriteriosCurriculares()) {
            ReglaMotor regla = ReglaMotor.builder()
                    .requerimiento(req)
                    .tipoRegla("FILTRO")
                    .nombreRegla(criterio.getCriterio())
                    .descripcion("Criterio curricular: " + criterio.getCriterio())
                    .etapaEvaluacion("CURRICULAR")
                    .peso(criterio.getPeso())
                    .valorParametro(criterio.getPuntajeMaximo().toString())
                    .prioridad(prioridad++)
                    .activo(true)
                    .usuarioCreacion(username)
                    .build();
            reglas.add(regla);
        }

        List<ReglaMotor> reglasGuardadas = reglaRepo.saveAll(reglas);

        // Transición → CONFIGURADO (Conformidad)
        req.setEstado(EstadoRequerimiento.CONFIGURADO.name());
        req.setUsuarioModificacion(username);
        req = reqRepo.save(req);

        // Auditoría D.L. 1451
        auditPort.registrar("TBL_REQUERIMIENTO", req.getIdRequerimiento(),
                "CONFIGURAR_REGLAS", estadoAnterior, "CONFIGURADO", httpReq,
                "Pesos: C=" + request.getPesoEvalCurricular()
                + "/T=" + request.getPesoEvalTecnica()
                + "/E=" + request.getPesoEntrevista()
                + ", Criterios: " + request.getCriteriosCurriculares().size());


                notificacionService.notificarUsuario(
                        req.getIdUsuarioSolicitante(),
                        "Motor de reglas configurado",
                        "El requerimiento " + req.getNumeroRequerimiento()
                                + " quedó en estado CONFIGURADO y ya puede pasar a la etapa de convocatoria.",
                        username
                );
                // Notificar a ORH
                notificacionService.notificarRol("ORH", "Motor de reglas configurado", "El requerimiento " + req.getNumeroRequerimiento()
                + " quedó en estado CONFIGURADO y ya puede pasar a la etapa de convocatoria.", username);
                // Notificar a OPP
                notificacionService.notificarRol("OPP", "Motor de reglas configurado", "El requerimiento " + req.getNumeroRequerimiento()
                + " quedó en estado CONFIGURADO y ya puede pasar a la etapa de convocatoria.", username);       

        // Respuesta con MotorReglasResumen
        RequerimientoResponse response = mapper.toResponseConMotor(req, reglasGuardadas);
        response.setMensaje("Motor de Reglas configurado. Listo para Etapa 2.");
        return response;
    }

    // ══════════════════════════════════════════════════════════════
    // MÉTODOS AUXILIARES
    // ══════════════════════════════════════════════════════════════

    /**
     * Busca requerimiento o lanza ResourceNotFoundException.
     */
    private Requerimiento findOrThrow(Long id) {
        return reqRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Requerimiento", id));
    }

    /**
     * Valida transición de estado según máquina BPMN documentada.
     * Usa EstadoRequerimiento.puedeTransicionarA().
     *
     * @throws DomainException si la transición no es válida
     */
    private void validarTransicion(Requerimiento req, EstadoRequerimiento nuevo) {
        EstadoRequerimiento actual = EstadoRequerimiento.valueOf(req.getEstado());
        if (!actual.puedeTransicionarA(nuevo)) {
            String permitidas = getTransicionesPermitidas(actual);
            throw new DomainException(
                    "Transición de estado inválida: " + actual + " → " + nuevo
                    + ". Transiciones permitidas desde " + actual + ": " + permitidas);
        }
    }

    /**
     * Obtiene transiciones permitidas para mensajes de error descriptivos.
     */
    private String getTransicionesPermitidas(EstadoRequerimiento actual) {
        return Arrays.stream(EstadoRequerimiento.values())
                .filter(actual::puedeTransicionarA)
                .map(Enum::name)
                .collect(Collectors.joining(", "));
    }

    /**
     * Factory method para crear ReglaMotor de tipo CALCULO.
     */
    private ReglaMotor buildRegla(Requerimiento req, String tipo, String nombre,
                                   String etapa, BigDecimal peso, BigDecimal umbral,
                                   int prioridad, String username) {
        return ReglaMotor.builder()
                .requerimiento(req)
                .tipoRegla(tipo)
                .nombreRegla(nombre)
                .descripcion(nombre + " — Motor RF-14")
                .etapaEvaluacion(etapa)
                .peso(peso)
                .umbralMinimo(umbral)
                .prioridad(prioridad)
                .activo(true)
                .usuarioCreacion(username)
                .build();
    }
}
