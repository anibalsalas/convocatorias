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
import pe.gob.acffaa.sisconv.application.dto.request.PostulanteConocimientoRequest;
import pe.gob.acffaa.sisconv.application.dto.response.ApiResponse;
import pe.gob.acffaa.sisconv.application.dto.response.PostulanteConocimientoResponse;
import pe.gob.acffaa.sisconv.application.dto.response.SustentoPdf;
import pe.gob.acffaa.sisconv.application.service.PostulanteConocimientoService;

import java.util.List;

@RestController
@RequestMapping("/postulantes/mi-perfil/conocimientos")
@Tag(name = "Mi Perfil - Conocimientos", description = "Gestión de conocimientos del postulante")
public class PostulanteConocimientoController {

    private final PostulanteConocimientoService service;

    public PostulanteConocimientoController(PostulanteConocimientoService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Listar conocimientos")
    public ResponseEntity<ApiResponse<List<PostulanteConocimientoResponse>>> listar(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(service.listar(auth.getName())));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Registrar conocimiento")
    public ResponseEntity<ApiResponse<PostulanteConocimientoResponse>> registrar(
            @Valid @ModelAttribute PostulanteConocimientoRequest request,
            @RequestParam("archivo") MultipartFile archivo,
            Authentication auth,
            HttpServletRequest httpRequest
    ) throws Exception {
        PostulanteConocimientoResponse response =
                service.registrar(auth.getName(), request, archivo, httpRequest);

        return ResponseEntity.ok(ApiResponse.ok(response, "Conocimiento registrado correctamente"));
    }

    @PutMapping(value = "/{idConocimiento}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Actualizar conocimiento")
    public ResponseEntity<ApiResponse<PostulanteConocimientoResponse>> actualizar(
            @PathVariable Long idConocimiento,
            @Valid @ModelAttribute PostulanteConocimientoRequest request,
            @RequestParam(value = "archivo", required = false) MultipartFile archivo,
            Authentication auth,
            HttpServletRequest httpRequest
    ) throws Exception {
        PostulanteConocimientoResponse response =
                service.actualizar(auth.getName(), idConocimiento, request, archivo, httpRequest);

        return ResponseEntity.ok(ApiResponse.ok(response, "Conocimiento actualizado correctamente"));
    }

    @DeleteMapping("/{idConocimiento}")
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Eliminar conocimiento")
    public ResponseEntity<ApiResponse<Void>> eliminar(
            @PathVariable Long idConocimiento,
            Authentication auth,
            HttpServletRequest httpRequest
    ) {
        service.eliminar(auth.getName(), idConocimiento, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(null, "Conocimiento eliminado correctamente"));
    }

    @GetMapping("/{idConocimiento}/sustento")
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Descargar sustento PDF")
    public ResponseEntity<byte[]> descargarSustento(
            @PathVariable Long idConocimiento,
            Authentication auth
    ) {
        SustentoPdf sustento = service.obtenerSustento(auth.getName(), idConocimiento);

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