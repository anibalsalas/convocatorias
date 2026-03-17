package pe.gob.acffaa.sisconv.presentation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import pe.gob.acffaa.sisconv.application.dto.request.AprobarPerfilRequest;
import pe.gob.acffaa.sisconv.application.dto.request.PerfilPuestoRequest;
import pe.gob.acffaa.sisconv.application.dto.request.ValidarPerfilRequest;
import pe.gob.acffaa.sisconv.application.dto.response.ApiResponse;
import pe.gob.acffaa.sisconv.application.dto.response.NivelPuestoResponse;
import pe.gob.acffaa.sisconv.application.dto.response.PerfilPuestoContextResponse;
import pe.gob.acffaa.sisconv.application.dto.response.PerfilPuestoResponse;
import pe.gob.acffaa.sisconv.application.service.PerfilPuestoService;

/**
 * Controlador REST para gestion de Perfiles de Puesto CAS (AF M01).
 * Endpoints: POST/GET/PUT /api/sisconv/perfiles-puesto
 * RBAC: ADMIN, AREA_SOLICITANTE crean/editan; ORH, OPP consultan.
 * Paginacion: Pageable con sort por fechaCreacion DESC por defecto.
 * Presentation layer: solo orquestacion HTTP, sin logica.
 */
@RestController
@RequestMapping("/perfiles-puesto")
@Tag(name = "PKG-01: Perfil de Puesto", description = "Gestion de perfiles de puesto CAS")
public class PerfilPuestoController {

    private final PerfilPuestoService perfilService;

    public PerfilPuestoController(PerfilPuestoService perfilService) {
        this.perfilService = perfilService;
    }

    /**
     * POST /perfiles-puesto - Crear nuevo perfil de puesto con hijos opcionales.
     * Roles: ADMIN, AREA_SOLICITANTE.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'AREA_SOLICITANTE')")
    @Operation(summary = "Crear perfil de puesto", description = "CU-01: Registrar perfil de puesto CAS con requisitos, funciones y condiciones")
    public ResponseEntity<ApiResponse<PerfilPuestoResponse>> crear(
            @Valid @RequestBody PerfilPuestoRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        PerfilPuestoResponse response = perfilService.crear(request, auth.getName(), httpReq);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Perfil de puesto creado exitosamente"));
    }

    /**
     * DELETE /perfiles-puesto/id - Eliminar perfil en estado PENDIENTE.
     */
    @DeleteMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AREA_SOLICITANTE')")
    @Operation(summary = "Eliminar perfil de puesto", description = "Solo perfiles en estado PENDIENTE pueden eliminarse")
    public ResponseEntity<ApiResponse<Void>> eliminar(@PathVariable Long id, Authentication auth) {
        perfilService.eliminar(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null, "Perfil eliminado correctamente"));
    }

    /**
     * GET /perfiles-puesto/count-pendientes-requerimiento - Cuenta perfiles aprobados sin requerimiento.
     */
    @GetMapping("/count-pendientes-requerimiento")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'OPP', 'AREA_SOLICITANTE')")
    @Operation(summary = "Contar pendientes de requerimiento",
            description = "Cuenta perfiles aprobados que aún no tienen requerimiento vigente asociado")
    public ResponseEntity<ApiResponse<Long>> contarPendientesRequerimiento() {
        return ResponseEntity.ok(ApiResponse.ok(perfilService.contarPendientesRequerimiento()));
    }

    /**
     * GET /perfiles-puesto/count-pendientes-validar-aprobar - Cuenta perfiles pendientes de validar/aprobar por ORH.
     */
    @GetMapping("/count-pendientes-validar-aprobar")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "Contar pendientes de validar y aprobar",
            description = "Cuenta perfiles en estado PENDIENTE o VALIDADO que requieren accion de ORH")
    public ResponseEntity<ApiResponse<Long>> contarPendientesValidarAprobar() {
        return ResponseEntity.ok(ApiResponse.ok(perfilService.contarPendientesValidarAprobar()));
    }

    /**
     * GET /perfiles-puesto/contexto-registro - Contexto del usuario autenticado para autocompletar formulario.
     */
    @GetMapping("/contexto-registro")
    @PreAuthorize("hasAnyRole('ADMIN', 'AREA_SOLICITANTE', 'ORH', 'OPP')")
    @Operation(summary = "Obtener contexto de registro del perfil",
            description = "Retorna el area/unidad organica del usuario autenticado para autocompletar el formulario")
    public ResponseEntity<ApiResponse<PerfilPuestoContextResponse>> obtenerContextoRegistro(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(perfilService.obtenerContextoRegistro(auth.getName())));
    }

    /**
     * GET /perfiles-puesto/niveles-puesto - Catalogo TBL_NIVEL_PUESTO para select.
     */
    @GetMapping("/niveles-puesto")
    @PreAuthorize("hasAnyRole('ADMIN', 'AREA_SOLICITANTE', 'ORH', 'OPP')")
    @Operation(summary = "Listar niveles de puesto",
            description = "Catalogo TBL_NIVEL_PUESTO para select Nivel del Puesto")
    public ResponseEntity<ApiResponse<List<NivelPuestoResponse>>> listarNivelesPuesto() {
        return ResponseEntity.ok(ApiResponse.ok(perfilService.listarNivelesPuesto()));
    }

    /**
     * GET /perfiles-puesto - Listar perfiles con paginacion y filtro por estado.
     * Roles: ADMIN, ORH, OPP, AREA_SOLICITANTE.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'OPP', 'AREA_SOLICITANTE')")
    @Operation(summary = "Listar perfiles de puesto", description = "CU-02: Listado paginado con filtro por estado")
    public ResponseEntity<ApiResponse<Page<PerfilPuestoResponse>>> listar(
            @RequestParam(required = false) String estado,
            @PageableDefault(size = 10, sort = "fechaCreacion") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(perfilService.listar(estado, pageable)));
    }

    /**
     * GET /perfiles-puesto/id - Obtener detalle completo de un perfil.
     * Roles: ADMIN, ORH, OPP, AREA_SOLICITANTE, COMITE.
     */
    @GetMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'OPP', 'AREA_SOLICITANTE', 'COMITE')")
    @Operation(summary = "Obtener perfil por ID", description = "CU-02: Detalle con requisitos, funciones y condiciones")
    public ResponseEntity<ApiResponse<PerfilPuestoResponse>> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(perfilService.obtenerPorId(id)));
    }

    /**
     * PUT /perfiles-puesto/id - Actualizar perfil existente (reemplaza hijos).
     * Roles: ADMIN, AREA_SOLICITANTE.
     */
    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AREA_SOLICITANTE')")
    @Operation(summary = "Actualizar perfil de puesto", description = "CU-02: Modificar perfil y sus componentes")
    public ResponseEntity<ApiResponse<PerfilPuestoResponse>> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody PerfilPuestoRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        PerfilPuestoResponse response = perfilService.actualizar(id, request, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(response, "Perfil de puesto actualizado"));
    }

    /**
     * E3 - PUT /perfiles-puesto/id/validar - Validar perfil contra MPP vigente.
     * cumpleMpp=true: VALIDADO; cumpleMpp=false: RECHAZADO.
     * Roles: ADMIN, ORH.
     */
    @PutMapping("/{id:\\d+}/validar")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "E3: Validar perfil contra MPP",
            description = "CU-02: Validar perfil contra Manual de Perfiles de Puesto vigente")
    public ResponseEntity<ApiResponse<PerfilPuestoResponse>> validar(
            @PathVariable Long id,
            @Valid @RequestBody ValidarPerfilRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        PerfilPuestoResponse response = perfilService.validar(id, request, auth.getName(), httpReq);
        String msg = Boolean.TRUE.equals(request.getCumpleMpp())
                ? "Perfil validado exitosamente contra MPP"
                : "Perfil rechazado - no cumple MPP vigente";
        return ResponseEntity.ok(ApiResponse.ok(response, msg));
    }

    /**
     * E4 - PUT /perfiles-puesto/id/aprobar - Aprobar perfil en el sistema.
     * Precondicion: perfil en estado VALIDADO.
     * Roles: ADMIN, ORH.
     */
    @PutMapping("/{id:\\d+}/aprobar")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "E4: Aprobar perfil de puesto",
            description = "CU-02: Aprobar perfil validado para convocatoria CAS")
    public ResponseEntity<ApiResponse<PerfilPuestoResponse>> aprobar(
            @PathVariable Long id,
            @Valid @RequestBody AprobarPerfilRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        PerfilPuestoResponse response = perfilService.aprobar(id, request, auth.getName(), httpReq);
        String msg = Boolean.TRUE.equals(request.getAprobado())
                ? "Perfil aprobado exitosamente"
                : "Perfil rechazado en etapa de aprobación";
        return ResponseEntity.ok(ApiResponse.ok(response, msg));
    }

    /**
     * E5 - GET /perfiles-puesto/id/pdf - Generar perfil en formato PDF.
     * Contiene campos RPE 065-2020, requisitos, funciones y condiciones.
     * Roles: ADMIN, ORH.
     */
    @GetMapping("/{id:\\d+}/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'AREA_SOLICITANTE')")
    @Operation(summary = "E5: Generar perfil en PDF",
            description = "CU-02: Generar perfil de puesto en formato PDF descargable")
    public ResponseEntity<byte[]> generarPdf(@PathVariable Long id) {
        byte[] pdf = perfilService.generarPdf(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "PERFIL-PUESTO-" + id + ".pdf");
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }
}
