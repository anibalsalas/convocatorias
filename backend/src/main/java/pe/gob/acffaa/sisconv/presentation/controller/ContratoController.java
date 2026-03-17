package pe.gob.acffaa.sisconv.presentation.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.service.ContratoService;

/**
 * ContratoController — PKG-04 Etapa 4: Suscripción y Registro del Contrato CAS.
 * Endpoints E32-E37. Rol: ROLE_ORH (D.Leg. 1057).
 *
 * Context path: /api/sisconv/contratos
 * Coherencia: Endpoints_DTOs_v2 §5, DiagramaFlujo_04 (BPMN 4.1-4.8)
 */
@RestController
@RequestMapping("/contratos")
public class ContratoController {

    private final ContratoService service;

    public ContratoController(ContratoService s) { this.service = s; }

    /** E32 — POST /contratos/{id}/notificar-ganador. BPMN 4.1, RF-17 */
    @PostMapping("/{id}/notificar-ganador")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<ContratoResponse>> notificarGanador(
            @PathVariable Long id,
            @Valid @RequestBody NotificarGanadorRequest req,
            HttpServletRequest http) {
        ContratoResponse r = service.notificarGanador(id, req, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    /** E33 — POST /contratos/{id}/verificar-documentos. BPMN 4.4, RN-22 */
    @PostMapping("/{id}/verificar-documentos")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<VerificacionDocsResponse>> verificarDocumentos(
            @PathVariable Long id,
            @Valid @RequestBody VerificarDocumentosRequest req,
            HttpServletRequest http) {
        VerificacionDocsResponse r = service.verificarDocumentos(id, req, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    /** E34 — POST /contratos/{id}/suscribir. BPMN 4.6, D.Leg. 1057 */
    @PostMapping("/{id}/suscribir")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<ContratoResponse>> suscribir(
            @PathVariable Long id,
            @Valid @RequestBody SuscribirContratoRequest req,
            HttpServletRequest http) {
        ContratoResponse r = service.suscribir(id, req, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    /** E35 — POST /contratos/{id}/convocar-accesitario. BPMN 4.5, RN-20/21 */
    @PostMapping("/{id}/convocar-accesitario")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<ContratoResponse>> convocarAccesitario(
            @PathVariable Long id,
            @Valid @RequestBody ConvocarAccesitarioRequest req,
            HttpServletRequest http) {
        ContratoResponse r = service.convocarAccesitario(id, req, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    /** E36 — PUT /contratos/{id}/registrar-planilla. BPMN 4.7, D.S. 018-2007-TR */
    @PutMapping("/{id}/registrar-planilla")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<PlanillaResponse>> registrarPlanilla(
            @PathVariable Long id,
            @Valid @RequestBody RegistrarPlanillaRequest req,
            HttpServletRequest http) {
        PlanillaResponse r = service.registrarPlanilla(id, req, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    /** E37 — PUT /contratos/{id}/cerrar. BPMN 4.8, RN-26 */
    @PutMapping("/{id}/cerrar")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<ContratoResponse>> cerrar(
            @PathVariable Long id,
            @Valid @RequestBody CerrarProcesoRequest req,
            HttpServletRequest http) {
        ContratoResponse r = service.cerrar(id, req, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }
}
