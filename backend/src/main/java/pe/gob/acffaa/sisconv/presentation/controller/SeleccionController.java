package pe.gob.acffaa.sisconv.presentation.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.service.ComunicadoService;
import pe.gob.acffaa.sisconv.application.service.NotificacionService;
import pe.gob.acffaa.sisconv.application.service.SeleccionService;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/convocatorias")
public class SeleccionController {
    private final SeleccionService service;
    private final NotificacionService notificacionService;
    private final ComunicadoService comunicadoService;

    public SeleccionController(SeleccionService s, NotificacionService ns, ComunicadoService cs) {
        this.service = s;
        this.notificacionService = ns;
        this.comunicadoService = cs;
    }

    // ── E-COM: Comunicados oficiales DS 083-2019-PCM Art. 10 ─────────────────

    @PostMapping("/{id}/comunicados")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<ComunicadoResponse>> publicarComunicado(
            @PathVariable Long id, @Valid @RequestBody ComunicadoRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(
                comunicadoService.publicar(id, req), "Comunicado publicado"));
    }

    @GetMapping("/{id}/comunicados")
    @PreAuthorize("hasAnyRole('ADMIN','ORH','COMITE')")
    public ResponseEntity<ApiResponse<List<ComunicadoResponse>>> listarComunicados(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(comunicadoService.listar(id)));
    }

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

    /** E25-NOTIF: ORH notifica al COMITÉ que los códigos anónimos están listos */
    @PostMapping("/{id}/notificar-codigos-anonimos")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<NotificarCodigosResponse>> notificarCodigos(
            @PathVariable Long id, HttpServletRequest http) {
        return ResponseEntity.ok(ApiResponse.ok(service.notificarCodigosAnonimos(id, http)));
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

    /** E29-GET — lee cuadro ya calculado sin recalcular (re-entry read-only) */
    @GetMapping("/{id}/cuadro-meritos")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<CuadroMeritosResponse>> obtenerCuadroMeritos(
            @PathVariable Long id) {
        CuadroMeritosResponse r = service.obtenerCuadroMeritos(id);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    @PostMapping("/{id}/cuadro-meritos")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<CuadroMeritosResponse>> cuadroMeritos(
            @PathVariable Long id, HttpServletRequest http) {
        CuadroMeritosResponse r = service.cuadroMeritos(id, http);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }

    /** E24-UPLOAD: ORH sube PDF firmado digitalmente antes de publicar (DS 065-2011-PCM) */
    @PostMapping("/{id}/upload-pdf-firmado-e24")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadPdfFirmadoE24(
            @PathVariable Long id,
            @RequestParam("archivo") MultipartFile archivo,
            HttpServletRequest http) {
        Map<String, Object> result = service.uploadPdfFirmadoE24(id, archivo, http);
        return ResponseEntity.ok(ApiResponse.ok(result, "PDF firmado subido correctamente"));
    }

    /** E24-DOWNLOAD: descarga el PDF firmado subido por ORH */
    @GetMapping("/{id}/pdf-firmado-e24")
    @PreAuthorize("hasAnyRole('ADMIN','ORH','COMITE')")
    public ResponseEntity<byte[]> descargarPdfFirmadoE24(@PathVariable Long id) {
        byte[] pdf = service.descargarPdfFirmadoE24(id);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.set("Content-Disposition", "attachment;filename=RESULT-CURRICULAR-FIRMADO-" + id + ".pdf");
        return new ResponseEntity<>(pdf, h, HttpStatus.OK);
    }

    /** E24-PUBLICAR: acción explícita ORH — requiere PDF firmado subido (DS 065-2011-PCM) */
    @PostMapping("/{id}/publicar-resultados-curricular")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<byte[]> publicarResultadosCurricular(@PathVariable Long id, HttpServletRequest http) {
        byte[] pdf = service.publicarResultadosCurricular(id, http);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.set("Content-Disposition", "attachment;filename=RESULT-CURRICULAR-" + id + ".pdf");
        return new ResponseEntity<>(pdf, h, HttpStatus.OK);
    }

    /** Descarga interna del PDF curricular (sin cambiar estado, ya publicado) */
    @GetMapping("/{id}/resultados-curricular-pdf")
    @PreAuthorize("hasAnyRole('ADMIN','ORH','COMITE')")
    public ResponseEntity<byte[]> resultadosCurricularPdf(@PathVariable Long id) {
        byte[] pdf = service.generarResultadosCurricularPdf(id);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.set("Content-Disposition", "attachment;filename=RESULT-CURRICULAR-" + id + ".pdf");
        return new ResponseEntity<>(pdf, h, HttpStatus.OK);
    }

    /** E26-UPLOAD: ORH sube PDF firmado de resultados técnicos (DS 065-2011-PCM) */
    @PostMapping("/{id}/upload-pdf-firmado-e26")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadPdfFirmadoE26(
            @PathVariable Long id,
            @RequestParam("archivo") MultipartFile archivo,
            HttpServletRequest http) {
        Map<String, Object> result = service.uploadPdfFirmadoE26(id, archivo, http);
        return ResponseEntity.ok(ApiResponse.ok(result, "PDF firmado subido correctamente"));
    }

    /** E26-DOWNLOAD: descarga el PDF firmado de resultados técnicos subido por ORH */
    @GetMapping("/{id}/pdf-firmado-e26")
    @PreAuthorize("hasAnyRole('ADMIN','ORH','COMITE')")
    public ResponseEntity<byte[]> descargarPdfFirmadoE26(@PathVariable Long id) {
        byte[] pdf = service.descargarPdfFirmadoE26(id);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.set("Content-Disposition", "attachment;filename=RESULT-TECNICA-FIRMADO-" + id + ".pdf");
        return new ResponseEntity<>(pdf, h, HttpStatus.OK);
    }

    /** E26-PUBLICAR: acción explícita COMITÉ (presencial) u ORH (virtual) — persiste flag + devuelve PDF */
    @PostMapping("/{id}/publicar-resultados-tecnica")
    @PreAuthorize("hasAnyRole('ADMIN','COMITE','ORH')")
    public ResponseEntity<byte[]> publicarResultadosTecnica(@PathVariable Long id, HttpServletRequest http) {
        byte[] pdf = service.publicarResultadosTecnica(id, http);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.set("Content-Disposition", "attachment;filename=RESULT-TECNICA-" + id + ".pdf");
        return new ResponseEntity<>(pdf, h, HttpStatus.OK);
    }

    /** Descarga interna del PDF técnico (sin cambiar estado, ya publicado) */
    @GetMapping("/{id}/resultados-tecnica-pdf")
    @PreAuthorize("hasAnyRole('ADMIN','ORH','COMITE')")
    public ResponseEntity<byte[]> resultadosTecnicaPdf(@PathVariable Long id) {
        byte[] pdf = service.generarResultadosTecnicaPdf(id);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.set("Content-Disposition", "attachment;filename=RESULT-TECNICA-" + id + ".pdf");
        return new ResponseEntity<>(pdf, h, HttpStatus.OK);
    }

    /** E27-NOTIF: COMITÉ notifica a ORH que la entrevista está lista para E28/E31 */
    @PostMapping("/{id}/notificar-entrevista-orh")
    @PreAuthorize("hasAnyRole('ADMIN','COMITE')")
    public ResponseEntity<ApiResponse<NotificarCodigosResponse>> notificarEntrevistaOrh(
            @PathVariable Long id, HttpServletRequest http) {
        NotificarCodigosResponse res = service.notificarEntrevistaOrh(id, http);
        return ResponseEntity.ok(ApiResponse.ok(res, res.getMensaje()));
    }

    /** E27-PUBLICAR: COMITÉ registra → notifica ORH → ORH publica */
    @PostMapping("/{id}/publicar-resultados-entrevista")
    @PreAuthorize("hasAnyRole('ADMIN','COMITE','ORH')")
    public ResponseEntity<byte[]> publicarResultadosEntrevista(@PathVariable Long id, HttpServletRequest http) {
        byte[] pdf = service.publicarResultadosEntrevista(id, http);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.set("Content-Disposition", "attachment;filename=RESULT-ENTREVISTA-" + id + ".pdf");
        return new ResponseEntity<>(pdf, h, HttpStatus.OK);
    }

    /** Descarga interna del PDF entrevista (sin cambiar estado, ya publicado) */
    @GetMapping("/{id}/resultados-entrevista-pdf")
    @PreAuthorize("hasAnyRole('ADMIN','ORH','COMITE')")
    public ResponseEntity<byte[]> resultadosEntrevistaPdf(@PathVariable Long id) {
        byte[] pdf = service.generarResultadosEntrevistaPdf(id);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.set("Content-Disposition", "attachment;filename=RESULT-ENTREVISTA-" + id + ".pdf");
        return new ResponseEntity<>(pdf, h, HttpStatus.OK);
    }

    @GetMapping("/{id}/resultados-pdf")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<byte[]> resultadosPdf(@PathVariable Long id) {
        byte[] pdf = service.generarResultadosPdf(id);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.set("Content-Disposition", "attachment;filename=RESULTADOS-" + id + ".pdf");
        return new ResponseEntity<>(pdf, h, HttpStatus.OK);
    }

    @PostMapping("/{id}/publicar-resultados")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<PublicarResultadosResponse>> publicar(
            @PathVariable Long id, HttpServletRequest http) {
        // Phase 1: sync TX — transición FINALIZADA + log + encolado PENDIENTE
        PublicarResultadosResponse r = service.publicarResultados(id, http);
        // Phase 2: async DESPUÉS de TX confirmada — envío email con ENVIADO/FALLIDO
        notificacionService.procesarEnvioAsincrono(id);
        return ResponseEntity.ok(ApiResponse.ok(r, r.getMensaje()));
    }
}
