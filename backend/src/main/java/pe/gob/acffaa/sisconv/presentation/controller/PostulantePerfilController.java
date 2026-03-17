package pe.gob.acffaa.sisconv.presentation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import pe.gob.acffaa.sisconv.application.dto.request.ActualizarPerfilPostulanteRequest;
import pe.gob.acffaa.sisconv.application.dto.response.ApiResponse;
import pe.gob.acffaa.sisconv.application.dto.response.PostulantePerfilResponse;
import pe.gob.acffaa.sisconv.application.service.PostulantePerfilService;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;

/**
 * Controlador REST para Mi Perfil del postulante.
 * Endpoints: GET /postulantes/mi-perfil, PUT /postulantes/mi-perfil
 * RBAC: ROLE_POSTULANTE
 */
@RestController
@RequestMapping("/postulantes")
@Tag(name = "Mi Perfil", description = "Perfil del postulante autenticado")
public class PostulantePerfilController {

    private final PostulantePerfilService perfilService;
    private final IUsuarioRepository usuarioRepo;

    public PostulantePerfilController(PostulantePerfilService perfilService,
                                      IUsuarioRepository usuarioRepo) {
        this.perfilService = perfilService;
        this.usuarioRepo = usuarioRepo;
    }

    /**
     * GET /postulantes/mi-perfil — Obtiene el perfil del postulante autenticado.
     */
    @GetMapping("/mi-perfil")
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Obtener mi perfil", description = "Devuelve el perfil del postulante asociado al usuario autenticado")
    public ResponseEntity<ApiResponse<PostulantePerfilResponse>> obtenerMiPerfil(Authentication auth) {
        Long idUsuario = resolverIdUsuario(auth.getName());
        PostulantePerfilResponse response = perfilService.obtenerPorUsuario(idUsuario);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * PUT /postulantes/mi-perfil — Actualiza el perfil del postulante autenticado.
     */
    @PutMapping("/mi-perfil")
    @PreAuthorize("hasRole('POSTULANTE')")
    @Operation(summary = "Actualizar mi perfil", description = "Actualiza los datos del perfil del postulante autenticado")
    public ResponseEntity<ApiResponse<PostulantePerfilResponse>> actualizarMiPerfil(
            @Valid @RequestBody ActualizarPerfilPostulanteRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        Long idUsuario = resolverIdUsuario(auth.getName());
        PostulantePerfilResponse response = perfilService.actualizar(idUsuario, request, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(response, "Perfil actualizado correctamente"));
    }

    private Long resolverIdUsuario(String username) {
        Usuario usuario = usuarioRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", 0L));
        return usuario.getIdUsuario();
    }
}
