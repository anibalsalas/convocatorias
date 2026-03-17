package pe.gob.acffaa.sisconv.presentation.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.mapper.ContratoMapper;
import pe.gob.acffaa.sisconv.domain.model.Notificacion;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.INotificacionRepository;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;

/**
 * NotificacionController — E44: Bandeja de notificaciones paginada.
 * CU-28, Transversal RF-17.
 * Filtra por usuario del JWT. Índices: IDX_NOTIF_CONV, IDX_NOTIF_ESTADO.
 *
 * Context path: /api/sisconv/notificaciones
 * Coherencia: Endpoints_DTOs_v2 §7 (E44)
 */
@RestController
@RequestMapping("/notificaciones")
public class NotificacionController {

    private final INotificacionRepository notifRepo;
    private final IUsuarioRepository usuarioRepo;
    private final ContratoMapper mapper;

    public NotificacionController(INotificacionRepository nr,
                                  IUsuarioRepository ur,
                                  ContratoMapper m) {
        this.notifRepo = nr;
        this.usuarioRepo = ur;
        this.mapper = m;
    }

    /**
     * E44 — GET /notificaciones
     * Query params: ?estado=PENDIENTE&page=0&size=20&sort=fechaCreacion,desc
     * Rol: Cualquier usuario autenticado
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<NotificacionResponse>>> listar(
            @RequestParam(required = false) String estado,
            @PageableDefault(size = 20, sort = "fechaCreacion") Pageable pageable) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Usuario user = usuarioRepo.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.ok(ApiResponse.ok(Page.empty(pageable),
                    "Usuario no encontrado en el sistema."));
        }

        Page<Notificacion> page;
        if (estado != null && !estado.isBlank()) {
            page = notifRepo.findByUsuarioIdAndEstado(user.getIdUsuario(), estado, pageable);
        } else {
            page = notifRepo.findByUsuarioId(user.getIdUsuario(), pageable);
        }

        Page<NotificacionResponse> response = page.map(mapper::toNotificacionResponse);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
