package pe.gob.acffaa.sisconv.presentation.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.service.PostulacionService;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * PostulacionController — PKG-03 Etapa 3 (E17-E23 + vistas portal propias).
 */
@RestController
@RequestMapping
public class PostulacionController {

    private final PostulacionService service;

    @Value("${app.storage.base-path:${user.dir}/sisconv-uploads}")
    private String storagePath;

    public PostulacionController(PostulacionService service) {
        this.service = service;
    }

    /** E17 — POST /postulaciones. CU-12 */
    @PostMapping("/postulaciones")
    @PreAuthorize("hasAnyRole('ADMIN','POSTULANTE')")
    public ResponseEntity<ApiResponse<PostulacionResponse>> registrar(
            @Valid @RequestBody PostulacionRequest request,
            HttpServletRequest http) {
        PostulacionResponse resp = service.registrar(request, http);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(resp, resp.getMensaje()));
    }

    /** Portal postulante — lista propia con filtro JWT */
    @GetMapping("/postulaciones")
    @PreAuthorize("hasRole('POSTULANTE')")
    public ResponseEntity<ApiResponse<Page<PostulacionResponse>>> listarMisPostulaciones(
            @PageableDefault(size = 10, sort = "fechaPostulacion") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.listarMisPostulaciones(pageable)));
    }



    @GetMapping("/postulaciones/{id}")
    @PreAuthorize("hasAnyRole('POSTULANTE','ADMIN','ORH','COMITE')")
    public ResponseEntity<ApiResponse<PostulacionResponse>> obtenerMiPostulacion(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.obtenerMiPostulacion(id)));
    }

    /** Expediente por postulación — POSTULANTE ve el propio, COMITÉ/ORH/ADMIN ven cualquiera */
    @GetMapping("/postulaciones/{id}/expediente")
    @PreAuthorize("hasAnyRole('POSTULANTE','COMITE','ORH','ADMIN')")
    public ResponseEntity<ApiResponse<List<ExpedienteResponse>>> listarExpediente(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.listarExpediente(id)));
    }

    /** B3 — Descarga streaming de un documento del expediente para revisión del COMITÉ/ORH */
    @GetMapping("/postulaciones/{idPost}/expediente/{idExp}/descargar")
    @PreAuthorize("hasAnyRole('COMITE','ORH','ADMIN')")
    public ResponseEntity<Resource> descargarExpediente(
            @PathVariable Long idPost,
            @PathVariable Long idExp) {
        ExpedienteResponse meta = service.obtenerMetaExpediente(idPost, idExp);
        try {
            Path rutaReal = Paths.get(storagePath).resolve(meta.getRutaArchivo()).normalize();
            Resource resource = new UrlResource(rutaReal.toUri());
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }
            String contentType = meta.getNombreArchivo().toLowerCase().endsWith(".pdf")
                    ? "application/pdf" : "application/octet-stream";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + meta.getNombreArchivo() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /** E18 — POST /postulaciones/{id}/expediente. CU-13. Multipart */
    @PostMapping("/postulaciones/{id}/expediente")
    @PreAuthorize("hasAnyRole('ADMIN','POSTULANTE')")
    public ResponseEntity<ApiResponse<ExpedienteResponse>> cargarExpediente(
            @PathVariable Long id,
            @RequestParam("tipoDocumento") String tipoDocumento,
            @RequestParam("archivo") MultipartFile archivo,
            HttpServletRequest http) throws Exception {
        ExpedienteResponse resp = service.cargarExpediente(
                id,
                tipoDocumento,
                archivo.getOriginalFilename(),
                archivo.getBytes(),
                http
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(resp, resp.getMensaje()));
    }


    @PostMapping("/postulaciones/{id}/finalizar-expediente")
    @PreAuthorize("hasRole('POSTULANTE')")
    public ResponseEntity<ApiResponse<PostulacionResponse>> finalizarExpediente(
            @PathVariable Long id,
            HttpServletRequest http) {
        PostulacionResponse resp = service.finalizarExpediente(id, http);
        return ResponseEntity.ok(ApiResponse.ok(resp, resp.getMensaje()));
    }

    /** Rollback Administrativo — POST /postulaciones/{id}/rollback-admin. Solo ADMIN/ORH. Sustento obligatorio. */
    @PostMapping("/postulaciones/{id}/rollback-admin")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<PostulacionResponse>> rollbackAdmin(
            @PathVariable Long id,
            @Valid @RequestBody RollbackAdminRequest request,
            HttpServletRequest http) {
        PostulacionResponse resp = service.rollbackAdmin(id, request, http);
        return ResponseEntity.ok(ApiResponse.ok(resp, resp.getMensaje()));
    }

    /** E19 — POST /postulaciones/{id}/verificar-dl1451. CU-14 */
    @PostMapping("/postulaciones/{id}/verificar-dl1451")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<PostulacionResponse>> verificarDl1451(
            @PathVariable Long id,
            @Valid @RequestBody VerificacionDl1451Request request,
            HttpServletRequest http) {
        PostulacionResponse resp = service.verificarDl1451(id, request, http);
        return ResponseEntity.ok(ApiResponse.ok(resp, resp.getMensaje()));
    }

    /** E20 — POST /convocatorias/{id}/filtro-requisitos. CU-15 */
    @PostMapping("/convocatorias/{id}/filtro-requisitos")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<PostulacionResponse>> filtroRequisitos(
            @PathVariable Long id,
            HttpServletRequest http) {
        PostulacionResponse resp = service.filtroRequisitos(id, http);
        return ResponseEntity.ok(ApiResponse.ok(resp, resp.getMensaje()));
    }

    /** E21 — POST /convocatorias/{id}/tachas. CU-16 */
    @PostMapping("/convocatorias/{id}/tachas")
    @PreAuthorize("hasAnyRole('ADMIN','ORH','POSTULANTE')")
    public ResponseEntity<ApiResponse<TachaResponse>> registrarTacha(
            @PathVariable Long id,
            @Valid @RequestBody TachaRequest request,
            HttpServletRequest http) {
        TachaResponse resp = service.registrarTacha(id, request, http);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(resp, resp.getMensaje()));
    }

    /** E22 — PUT /tachas/{id}/resolver. CU-16 */
    @PutMapping("/tachas/{id}/resolver")
    @PreAuthorize("hasAnyRole('ADMIN','ORH')")
    public ResponseEntity<ApiResponse<TachaResponse>> resolverTacha(
            @PathVariable Long id,
            @Valid @RequestBody ResolverTachaRequest request,
            HttpServletRequest http) {
        TachaResponse resp = service.resolverTacha(id, request, http);
        return ResponseEntity.ok(ApiResponse.ok(resp, resp.getMensaje()));
    }

    /** E23 — GET /convocatorias/{id}/postulantes. Paginado */
    @GetMapping("/convocatorias/{id}/postulantes")
    @PreAuthorize("hasAnyRole('ADMIN','ORH','COMITE')")
    public ResponseEntity<ApiResponse<Page<PostulacionResponse>>> listarPostulantes(
            @PathVariable Long id,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.listarPostulantes(id, pageable)));
    }
}