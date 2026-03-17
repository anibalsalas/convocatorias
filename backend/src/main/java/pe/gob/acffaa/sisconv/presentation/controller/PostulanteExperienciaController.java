package pe.gob.acffaa.sisconv.presentation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.gob.acffaa.sisconv.application.dto.request.PostulanteExperienciaRequest;
import pe.gob.acffaa.sisconv.application.dto.response.ApiResponse;
import pe.gob.acffaa.sisconv.application.dto.response.PostulanteExperienciaResponse;
import pe.gob.acffaa.sisconv.application.dto.response.SustentoPdf;
import pe.gob.acffaa.sisconv.application.service.PostulanteExperienciaService;

import java.util.List;

@RestController
@RequestMapping("/postulantes/mi-perfil/experiencias")
@Tag(name = "Mi Perfil - Experiencia", description = "Gestión de experiencia laboral del postulante")
public class PostulanteExperienciaController {

    private final PostulanteExperienciaService service;

    public PostulanteExperienciaController(PostulanteExperienciaService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Listar experiencia laboral")
    public ResponseEntity<ApiResponse<List<PostulanteExperienciaResponse>>> listar(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(service.listar(auth.getName())));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Registrar experiencia laboral")
    public ResponseEntity<ApiResponse<PostulanteExperienciaResponse>> registrar(
            @Valid @ModelAttribute PostulanteExperienciaRequest request,
            @RequestParam("archivo") MultipartFile archivo,
            Authentication auth,
            HttpServletRequest httpRequest
    ) throws Exception {
        PostulanteExperienciaResponse response =
                service.registrar(auth.getName(), request, archivo, httpRequest);

        return ResponseEntity.ok(ApiResponse.ok(response, "Experiencia registrada correctamente"));
    }

    @PutMapping(value = "/{idExperiencia}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Actualizar experiencia laboral")
    public ResponseEntity<ApiResponse<PostulanteExperienciaResponse>> actualizar(
            @PathVariable Long idExperiencia,
            @Valid @ModelAttribute PostulanteExperienciaRequest request,
            @RequestParam(value = "archivo", required = false) MultipartFile archivo,
            Authentication auth,
            HttpServletRequest httpRequest
    ) throws Exception {
        PostulanteExperienciaResponse response =
                service.actualizar(auth.getName(), idExperiencia, request, archivo, httpRequest);

        return ResponseEntity.ok(ApiResponse.ok(response, "Experiencia actualizada correctamente"));
    }

    @DeleteMapping("/{idExperiencia}")
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Eliminar experiencia laboral")
    public ResponseEntity<ApiResponse<Void>> eliminar(
            @PathVariable Long idExperiencia,
            Authentication auth,
            HttpServletRequest httpRequest
    ) {
        service.eliminar(auth.getName(), idExperiencia, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(null, "Experiencia eliminada correctamente"));
    }

    @GetMapping("/{idExperiencia}/sustento")
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Descargar sustento PDF")
    public ResponseEntity<byte[]> descargarSustento(
            @PathVariable Long idExperiencia,
            Authentication auth
    ) {
        SustentoPdf sustento = service.obtenerSustento(auth.getName(), idExperiencia);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
                ContentDisposition.inline()
                        .filename(sustento.nombreArchivo())
                        .build()
        );

        return ResponseEntity.ok()
                .headers(headers)
                .body(sustento.contenido());
    }
}