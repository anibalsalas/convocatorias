package pe.gob.acffaa.sisconv.presentation.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.service.SeleccionService;
import java.util.List;

@RestController
@RequestMapping("/convocatorias")
public class SeleccionController {
    private final SeleccionService service;
    public SeleccionController(SeleccionService s) { this.service = s; }

    @PostMapping("/{id}/eval-curricular")
    @PreAuthorize("hasAnyRole('ADMIN','COMITE')")
    public ResponseEntity<ApiResponse<EvalCurricularResponse>> evalCurricular(
            @PathVariable Long id, @Valid @RequestBody EvalCurricularRequest req, HttpServletRequest http) {
        EvalCurricularResponse r = service.evalCurricular(id, req, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    @PostMapping("/{id}/codigos-anonimos")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<List<PostulacionResponse>>> codigos(
            @PathVariable Long id, HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.ok(service.asignarCodigosAnonimos(id, http)));
    }

    @PostMapping("/{id}/eval-tecnica")
    @PreAuthorize("hasAnyRole('ADMIN','COMITE')")
    public ResponseEntity<ApiResponse<EvalTecnicaResponse>> evalTecnica(
            @PathVariable Long id, @Valid @RequestBody EvalTecnicaRequest req, HttpServletRequest http) {
        EvalTecnicaResponse r = service.evalTecnica(id, req, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    @PostMapping("/{id}/entrevistas")
    @PreAuthorize("hasAnyRole('ADMIN','COMITE')")
    public ResponseEntity<ApiResponse<EntrevistaResponse>> entrevistas(
            @PathVariable Long id, @Valid @RequestBody EntrevistaRequest req, HttpServletRequest http) {
        EntrevistaResponse r = service.entrevistas(id, req, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    @PostMapping("/{id}/bonificaciones")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<BonificacionResponse>> bonificaciones(
            @PathVariable Long id, HttpServletRequest http) {
        BonificacionResponse r = service.bonificaciones(id, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    @PostMapping("/{id}/cuadro-meritos")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<CuadroMeritosResponse>> cuadroMeritos(
            @PathVariable Long id, HttpServletRequest http) {
        CuadroMeritosResponse r = service.cuadroMeritos(id, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    @GetMapping("/{id}/resultados-pdf")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<byte[]> resultadosPdf(@PathVariable Long id) {
        byte[] pdf = service.generarResultadosPdf(id);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.TEXT_PLAIN);
        h.set("Content-Disposition", "attachment;filename=resultados_" + id + ".txt");
        return new ResponseEntity<>(pdf, h, HttpStatus.OK);
    }

    @PostMapping("/{id}/publicar-resultados")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<CuadroMeritosResponse>> publicar(
            @PathVariable Long id, HttpServletRequest http) {
        CuadroMeritosResponse r = service.publicarResultados(id, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }
}
