package pe.gob.acffaa.sisconv.presentation.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.service.ExamenVirtualService;
import pe.gob.acffaa.sisconv.domain.model.BancoPregunta;

import java.util.List;

/**
 * Examen Técnico Virtual — V34.
 * Endpoints separados del SeleccionController para no inflar el flujo E26 manual.
 *
 * Seguridad RBAC:
 *   - Banco de preguntas: AREA_SOLICITANTE (carga/consulta contenido), ORH (solo estado)
 *   - Configuración: ORH
 *   - Examen postulante: POSTULANTE
 *   - Resultados: ORH
 */
@RestController
@RequestMapping("/convocatorias")
public class ExamenVirtualController {

    private final ExamenVirtualService service;

    public ExamenVirtualController(ExamenVirtualService s) { this.service = s; }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. BANCO DE PREGUNTAS
    // ═══════════════════════════════════════════════════════════════════════

    /** Cargar banco de preguntas — AREA_SOLICITANTE */
    @PostMapping("/{id}/banco-preguntas")
    @PreAuthorize("hasAnyRole('ADMIN','AREA_SOLICITANTE')")
    public ResponseEntity<ApiResponse<BancoPreguntaEstadoResponse>> cargarBanco(
            @PathVariable Long id, @Valid @RequestBody BancoPreguntaRequest req, HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.ok(service.cargarBanco(id, req, http),
                "Banco de preguntas cargado correctamente"));
    }

    /** Consultar contenido completo del banco — solo AREA_SOLICITANTE y ADMIN */
    @GetMapping("/{id}/banco-preguntas")
    @PreAuthorize("hasAnyRole('ADMIN','AREA_SOLICITANTE')")
    public ResponseEntity<ApiResponse<List<BancoPregunta>>> obtenerBanco(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.obtenerBancoCompleto(id)));
    }

    /** Estado del banco (metadatos) — ORH y ADMIN. SIN contenido de preguntas. */
    @GetMapping("/{id}/banco-preguntas/estado")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<BancoPreguntaEstadoResponse>> estadoBanco(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.estadoBanco(id)));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. CONFIGURACIÓN DEL EXAMEN — ORH
    // ═══════════════════════════════════════════════════════════════════════

    /** Configurar examen virtual — ORH */
    @PostMapping("/{id}/config-examen")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<ConfigExamenResponse>> configurarExamen(
            @PathVariable Long id, @Valid @RequestBody ConfigExamenRequest req, HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.ok(service.configurarExamen(id, req, http),
                "Examen configurado"));
    }

    /** Obtener configuración actual — ORH */
    @GetMapping("/{id}/config-examen")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<ConfigExamenResponse>> obtenerConfig(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.obtenerConfig(id)));
    }

    /** Publicar examen — ORH. Cambia estado a PUBLICADO. */
    @PostMapping("/{id}/publicar-examen")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<ConfigExamenResponse>> publicarExamen(
            @PathVariable Long id, HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.ok(service.publicarExamen(id, http)));
    }

    /** Notificar a postulantes APTO — ORH */
    @PostMapping("/{id}/notificar-examen")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<ConfigExamenResponse>> notificarExamen(
            @PathVariable Long id, HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.ok(service.notificarPostulantes(id, http)));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. EXAMEN DEL POSTULANTE
    // ═══════════════════════════════════════════════════════════════════════

    /** Iniciar o reanudar examen — POSTULANTE */
    @PostMapping("/{id}/examen/{idPostulacion}/iniciar")
    @PreAuthorize("hasAnyRole('ADMIN','POSTULANTE')")
    public ResponseEntity<ApiResponse<ExamenPostulanteResponse>> iniciarExamen(
            @PathVariable Long id, @PathVariable Long idPostulacion, HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.ok(service.iniciarExamen(id, idPostulacion, http)));
    }

    /** Enviar respuestas — POSTULANTE */
    @PostMapping("/{id}/examen/{idPostulacion}/responder")
    @PreAuthorize("hasAnyRole('ADMIN','POSTULANTE')")
    public ResponseEntity<ApiResponse<ExamenPostulanteResponse>> responderExamen(
            @PathVariable Long id, @PathVariable Long idPostulacion,
            @Valid @RequestBody ResponderExamenRequest req, HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.ok(service.responderExamen(id, idPostulacion, req, http)));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. RESULTADOS CONSOLIDADOS — ORH
    // ═══════════════════════════════════════════════════════════════════════

    /** Resultados de todos los postulantes — ORH */
    @GetMapping("/{id}/examen-resultados")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<List<ExamenPostulanteResponse.ResultadoConsolidado>>> resultados(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.resultadosConsolidados(id)));
    }
}
