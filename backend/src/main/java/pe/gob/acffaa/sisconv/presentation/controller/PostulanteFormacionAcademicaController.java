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
import pe.gob.acffaa.sisconv.application.dto.request.PostulanteFormacionAcademicaRequest;
import pe.gob.acffaa.sisconv.application.dto.response.ApiResponse;
import pe.gob.acffaa.sisconv.application.dto.response.PostulanteFormacionAcademicaResponse;
import pe.gob.acffaa.sisconv.application.dto.response.SustentoPdf;
import pe.gob.acffaa.sisconv.application.service.PostulanteFormacionAcademicaService;

import java.util.List;

@RestController
@RequestMapping("/postulantes/mi-perfil/formaciones-academicas")
@Tag(name = "Mi Perfil - Formación Académica", description = "Gestión de formación académica del postulante")
public class PostulanteFormacionAcademicaController {

    private final PostulanteFormacionAcademicaService service;

    public PostulanteFormacionAcademicaController(PostulanteFormacionAcademicaService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Listar formación académica")
    public ResponseEntity<ApiResponse<List<PostulanteFormacionAcademicaResponse>>> listar(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(service.listar(auth.getName())));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Registrar formación académica")
    public ResponseEntity<ApiResponse<PostulanteFormacionAcademicaResponse>> registrar(
            @Valid @ModelAttribute PostulanteFormacionAcademicaRequest request,
            @RequestParam("archivo") MultipartFile archivo,
            Authentication auth,
            HttpServletRequest httpRequest
    ) throws Exception {
        PostulanteFormacionAcademicaResponse response =
                service.registrar(auth.getName(), request, archivo, httpRequest);

        return ResponseEntity.ok(ApiResponse.ok(response, "Formación académica registrada correctamente"));
    }

    @PutMapping(value = "/{idFormacionAcademica}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Actualizar formación académica")
    public ResponseEntity<ApiResponse<PostulanteFormacionAcademicaResponse>> actualizar(
            @PathVariable Long idFormacionAcademica,
            @Valid @ModelAttribute PostulanteFormacionAcademicaRequest request,
            @RequestParam(value = "archivo", required = false) MultipartFile archivo,
            Authentication auth,
            HttpServletRequest httpRequest
    ) throws Exception {
        PostulanteFormacionAcademicaResponse response =
                service.actualizar(auth.getName(), idFormacionAcademica, request, archivo, httpRequest);

        return ResponseEntity.ok(ApiResponse.ok(response, "Formación académica actualizada correctamente"));
    }

    @DeleteMapping("/{idFormacionAcademica}")
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Eliminar formación académica")
    public ResponseEntity<ApiResponse<Void>> eliminar(
            @PathVariable Long idFormacionAcademica,
            Authentication auth,
            HttpServletRequest httpRequest
    ) {
        service.eliminar(auth.getName(), idFormacionAcademica, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(null, "Formación académica eliminada correctamente"));
    }

    @GetMapping("/{idFormacionAcademica}/sustento")
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Descargar sustento PDF")
    public ResponseEntity<byte[]> descargarSustento(
            @PathVariable Long idFormacionAcademica,
            Authentication auth
    ) {
        SustentoPdf sustento = service.obtenerSustento(auth.getName(), idFormacionAcademica);

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