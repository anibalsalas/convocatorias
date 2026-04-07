package pe.gob.acffaa.sisconv.presentation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import pe.gob.acffaa.sisconv.application.dto.request.ConfigurarReglasRequest;
import pe.gob.acffaa.sisconv.application.dto.request.RequerimientoRequest;
import pe.gob.acffaa.sisconv.application.dto.request.VerificarPresupuestoRequest;
import pe.gob.acffaa.sisconv.application.dto.response.ApiResponse;
import pe.gob.acffaa.sisconv.application.dto.response.RequerimientoResponse;
import pe.gob.acffaa.sisconv.application.service.RequerimientoService;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;

/**
 * Controlador REST para gestión de Requerimientos de Personal CAS — PKG-01.
 *
 * Endpoints:
 *   E6:  POST /requerimientos                            — Crear (AREA_SOLICITANTE)
 *   E7:  POST /requerimientos/{id}/verificar-presupuesto — Verificar presupuesto (OPP)
 *   E8:  POST /requerimientos/{id}/configurar-reglas     — Configurar Motor RF-14 (ORH)
 *   ---: GET  /requerimientos                            — Listar paginado
 *   ---: GET  /requerimientos/{id}                       — Detalle por ID
 *
 * Flujo BPMN: Área solicita (E6) → OPP certifica (E7) → ORH configura Motor RF-14 (E8)
 * Estados: ELABORADO → CON_PRESUPUESTO → CONFIGURADO | SIN_PRESUPUESTO (terminal)
 *
 * RBAC según SAD §5.2:
 *   - ADMIN: acceso total
 *   - AREA_SOLICITANTE: crear requerimientos (E6)
 *   - OPP: consultar + verificar presupuesto (E7)
 *   - ORH: consultar + configurar reglas (E8)
 *
 * Auditoría D.L. 1451: Cada operación se registra en TBL_LOG_TRANSPARENCIA.
 */
@RestController
@RequestMapping("/requerimientos")
@Tag(name = "PKG-01: Requerimiento", description = "Gestión de requerimientos de personal CAS — Etapa 1")
public class RequerimientoController {

    private final RequerimientoService reqService;
    private final IUsuarioRepository usuarioRepo;

    public RequerimientoController(RequerimientoService reqService,
                                   IUsuarioRepository usuarioRepo) {
        this.reqService = reqService;
        this.usuarioRepo = usuarioRepo;
    }

    /**
     * E6 — POST /requerimientos — Crear requerimiento de contratación CAS.
     *
     * Tarea BPMN: Elaborar Requerimiento de Contratación (Etapa 1 — Área Solicitante).
     * CU-03: Selecciona perfil APROBADO, registra justificación y cantidad de puestos.
     * Estado inicial: ELABORADO. Número generado: REQ-{AÑO}-{NNNN}.
     *
     * Roles: ADMIN, AREA_SOLICITANTE
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'AREA_SOLICITANTE')")
    @Operation(summary = "E6: Crear requerimiento de contratación",
            description = "CU-03: Crear solicitud vinculada a perfil APROBADO. Estado inicial: ELABORADO")
    public ResponseEntity<ApiResponse<RequerimientoResponse>> crear(
            @Valid @RequestBody RequerimientoRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        Long idUsuario = resolverIdUsuario(auth.getName());
        boolean esAdministrador = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        RequerimientoResponse response = reqService.crear(request, auth.getName(), idUsuario, httpReq, esAdministrador);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Requerimiento creado: " + response.getNumeroRequerimiento()));
    }

    /**
     * E7 — POST /requerimientos/{id}/verificar-presupuesto — Verificación presupuestal OPP.
     *
     * Tarea BPMN: Gateway ¿Existen recursos? + Emitir Certificación + Registrar SIAF.
     * CU-04: OPP verifica disponibilidad presupuestal.
     *   - existePresupuesto=true  → CON_PRESUPUESTO (certificación + SIAF registrados)
     *   - existePresupuesto=false → SIN_PRESUPUESTO (terminal — Evento fin error BPMN)
     *
     * Roles: ADMIN, OPP
     */
    @PostMapping("/{id}/verificar-presupuesto")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPP')")
    @Operation(summary = "E7: Verificar disponibilidad presupuestal",
            description = "CU-04: OPP certifica presupuesto → CON_PRESUPUESTO o SIN_PRESUPUESTO (terminal)")
    public ResponseEntity<ApiResponse<RequerimientoResponse>> verificarPresupuesto(
            @PathVariable Long id,
            @Valid @RequestBody VerificarPresupuestoRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        Long idUsuario = resolverIdUsuario(auth.getName());
        RequerimientoResponse response = reqService.verificarPresupuesto(
                id, request, auth.getName(), idUsuario, httpReq);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMensaje()));
    }

    /**
     * E8 — POST /requerimientos/{id}/configurar-reglas — Configurar Motor de Reglas RF-14.
     *
     * Tarea BPMN: Configurar Pesos Ponderados y Umbrales Motor RF-14.
     * CU-05: ORH define pesos (sum=100%), umbrales mínimos, criterios curriculares.
     * Validación: CK_CONV_PESOS (pesoEvalCurricular + pesoEvalTecnica + pesoEntrevista = 100.00%).
     * Estado → CONFIGURADO (Conformidad, listo para Etapa 2 — PKG-02 Convocatoria).
     *
     * Roles: ADMIN, ORH
     */
    @PostMapping("/{id}/configurar-reglas")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "E8: Configurar Motor de Reglas RF-14",
            description = "CU-05: ORH configura pesos ponderados y umbrales → CONFIGURADO (Conformidad)")
    public ResponseEntity<ApiResponse<RequerimientoResponse>> configurarReglas(
            @PathVariable Long id,
            @Valid @RequestBody ConfigurarReglasRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        Long idUsuario = resolverIdUsuario(auth.getName());
        RequerimientoResponse response = reqService.configurarReglas(
                id, request, auth.getName(), idUsuario, httpReq);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMensaje()));
    }

    /**
     * GET /requerimientos — Listar requerimientos con paginación y filtros.
     *
     * Parámetros de filtro opcionales:
     *   - estado: ELABORADO, CON_PRESUPUESTO, SIN_PRESUPUESTO, CONFIGURADO
     *   - idArea: filtrar por área solicitante
     *
     * Roles: ADMIN, ORH, OPP, AREA_SOLICITANTE
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'OPP', 'AREA_SOLICITANTE')")
    @Operation(summary = "Listar requerimientos",
            description = "Listado paginado con filtros por estado BPMN y área solicitante")
    public ResponseEntity<ApiResponse<Page<RequerimientoResponse>>> listar(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Long idArea,
            @PageableDefault(size = 10, sort = "fechaSolicitud") Pageable pageable,
            Authentication auth) {
        // V35 — Si solo es AREA_SOLICITANTE, forzar filtro por su área (ignorar idArea del request)
        Long idAreaForzado = resolverIdAreaSiSoloAreaSolicitante(auth);
        if (idAreaForzado != null) {
            idArea = idAreaForzado;
        }
        return ResponseEntity.ok(ApiResponse.ok(reqService.listar(estado, idArea, pageable)));
    }

    /**
     * GET /requerimientos/count-pendientes-verificacion-presupuestal — Cuenta requerimientos pendientes de verificación presupuestal.
     * Roles permitidos: ADMIN, ORH, OPP, AREA_SOLICITANTE.
     */
    @GetMapping("/count-pendientes-verificacion-presupuestal")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'OPP', 'AREA_SOLICITANTE')")
    @Operation(summary = "Contar requerimientos pendientes de verificación presupuestal")
    public ResponseEntity<ApiResponse<Long>> contarPendientesVerificacionPresupuestal() {
        return ResponseEntity.ok(ApiResponse.ok(reqService.contarPendientesVerificacionPresupuestal()));
    }

    /**
     * GET /requerimientos/count-con-presupuesto-pendientes-reglas — Cuenta requerimientos CON_PRESUPUESTO pendientes de motor de reglas.
     * Roles permitidos: ADMIN, ORH, OPP, AREA_SOLICITANTE.
     */
    @GetMapping("/count-con-presupuesto-pendientes-reglas")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'OPP', 'AREA_SOLICITANTE')")
    @Operation(summary = "Contar requerimientos con presupuesto pendientes de configurar motor de reglas")
    public ResponseEntity<ApiResponse<Long>> contarConPresupuestoPendientesReglas() {
        return ResponseEntity.ok(ApiResponse.ok(reqService.contarConPresupuestoPendientesReglas()));
    }

    /**
     * GET /requerimientos/count-configurados-sin-convocatoria — Banner ORH: CONFIGURADO pendientes de crear convocatoria.
     * Roles permitidos: ADMIN, ORH.
     */
    @GetMapping("/count-configurados-sin-convocatoria")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "Contar requerimientos CONFIGURADO sin convocatoria (banner ORH — inicio Etapa 2)")
    public ResponseEntity<ApiResponse<Long>> contarConfiguradosSinConvocatoria() {
        return ResponseEntity.ok(ApiResponse.ok(reqService.contarConfiguradosSinConvocatoria()));
    }

    /**
     * GET /requerimientos/{id} — Obtener detalle con datos de verificación presupuestal.
     *
     * Roles: ADMIN, ORH, OPP, AREA_SOLICITANTE
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'OPP', 'AREA_SOLICITANTE')")
    @Operation(summary = "Obtener requerimiento por ID",
            description = "Detalle completo con perfil asociado y estado presupuestal")
    public ResponseEntity<ApiResponse<RequerimientoResponse>> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(reqService.obtenerPorId(id)));
    }

    /**
     * Resuelve el ID del usuario autenticado a partir del username.
     * Necesario para registrar ID_USUARIO en operaciones E6/E7/E8.
     */
    private Long resolverIdUsuario(String username) {
        Usuario usuario = usuarioRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", 0L));
        return usuario.getIdUsuario();
    }

    /** V35 — Resuelve idArea del usuario si solo tiene ROLE_AREA_SOLICITANTE (sin ORH/ADMIN/OPP). */
    private Long resolverIdAreaSiSoloAreaSolicitante(Authentication auth) {
        boolean esAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_ORH")
                        || a.getAuthority().equals("ROLE_OPP"));
        if (esAdmin) return null;
        return usuarioRepo.findByUsername(auth.getName())
                .map(Usuario::getIdArea)
                .orElse(null);
    }
}
