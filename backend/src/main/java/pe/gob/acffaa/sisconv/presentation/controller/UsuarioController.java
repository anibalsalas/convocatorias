package pe.gob.acffaa.sisconv.presentation.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.gob.acffaa.sisconv.application.dto.request.UsuarioRequest;
import pe.gob.acffaa.sisconv.application.dto.request.UsuarioUpdateRequest;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.service.UsuarioService;
import java.util.List;

/**
 * Gestión de Usuarios — AF §8 M10 | SAD §5.2: Solo ROLE_ADMIN
 */
@RestController
@RequestMapping("/admin/usuarios")
@PreAuthorize("hasRole('ADMIN')")
public class UsuarioController {

    private final UsuarioService usuarioService;
    public UsuarioController(UsuarioService usuarioService) { this.usuarioService = usuarioService; }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UsuarioResponse>>> listar() {
        return ResponseEntity.ok(ApiResponse.ok(usuarioService.listarTodos()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UsuarioResponse>> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(usuarioService.obtenerPorId(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UsuarioResponse>> crear(
            @Valid @RequestBody UsuarioRequest request, HttpServletRequest httpReq) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(usuarioService.crear(request, httpReq), "Usuario creado"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UsuarioResponse>> actualizar(
            @PathVariable Long id, @Valid @RequestBody UsuarioUpdateRequest request,
            HttpServletRequest httpReq) {
        return ResponseEntity.ok(ApiResponse.ok(usuarioService.actualizar(id, request, httpReq), "Usuario actualizado"));
    }

    @PatchMapping("/{id}/activar")
    public ResponseEntity<ApiResponse<UsuarioResponse>> activar(
            @PathVariable Long id, HttpServletRequest httpReq) {
        return ResponseEntity.ok(ApiResponse.ok(usuarioService.activar(id, httpReq), "Usuario activado"));
    }

    @PatchMapping("/{id}/desactivar")
    public ResponseEntity<ApiResponse<UsuarioResponse>> desactivar(
            @PathVariable Long id, HttpServletRequest httpReq) {
        return ResponseEntity.ok(ApiResponse.ok(usuarioService.desactivar(id, httpReq), "Usuario desactivado"));
    }
}
