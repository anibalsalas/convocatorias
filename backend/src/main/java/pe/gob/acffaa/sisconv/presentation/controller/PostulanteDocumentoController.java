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
import pe.gob.acffaa.sisconv.application.dto.request.PostulanteDocumentoRequest;
import pe.gob.acffaa.sisconv.application.dto.response.ApiResponse;
import pe.gob.acffaa.sisconv.application.dto.response.PostulanteDocumentoResponse;
import pe.gob.acffaa.sisconv.application.dto.response.SustentoPdf;
import pe.gob.acffaa.sisconv.application.service.PostulanteDocumentoService;

import java.util.List;

@RestController
@RequestMapping("/postulantes/mi-perfil/documentos")
@Tag(name = "Mi Perfil - Documentos", description = "Gestión de documentos sustentatorios del postulante")
public class PostulanteDocumentoController {

    private final PostulanteDocumentoService service;

    public PostulanteDocumentoController(PostulanteDocumentoService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Listar documentos sustentatorios")
    public ResponseEntity<ApiResponse<List<PostulanteDocumentoResponse>>> listar(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(service.listar(auth.getName())));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Registrar documento sustentatorio")
    public ResponseEntity<ApiResponse<PostulanteDocumentoResponse>> registrar(
            @Valid @ModelAttribute PostulanteDocumentoRequest request,
            @RequestParam("archivo") MultipartFile archivo,
            Authentication auth,
            HttpServletRequest httpRequest
    ) throws Exception {
        PostulanteDocumentoResponse response =
                service.registrar(auth.getName(), request, archivo, httpRequest);

        return ResponseEntity.ok(ApiResponse.ok(response, "Documento registrado correctamente"));
    }

    @DeleteMapping("/{idDocumento}")
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Eliminar documento sustentatorio")
    public ResponseEntity<ApiResponse<Void>> eliminar(
            @PathVariable Long idDocumento,
            Authentication auth,
            HttpServletRequest httpRequest
    ) {
        service.eliminar(auth.getName(), idDocumento, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(null, "Documento eliminado correctamente"));
    }

    @GetMapping("/{idDocumento}/sustento")
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Descargar sustento PDF")
    public ResponseEntity<byte[]> descargarSustento(
            @PathVariable Long idDocumento,
            Authentication auth
    ) {
        SustentoPdf sustento = service.obtenerSustento(auth.getName(), idDocumento);

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