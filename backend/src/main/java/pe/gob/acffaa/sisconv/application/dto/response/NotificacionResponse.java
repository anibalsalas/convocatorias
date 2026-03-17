


package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.time.LocalDateTime;

/**
 * Response para bandeja de notificaciones internas.
 * Separa estado de notificación de estado del proceso.
 * /**
 * Response para bandeja de notificaciones (E44).
 * Paginado server-side con filtro por usuario JWT y estado.
 *
 * Coherencia: Endpoints_DTOs_v2 §7 (E44), IDX_NOTIF_CONV, IDX_NOTIF_ESTADO
 */
 
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificacionResponse {
    private Long idNotificacion;
    private String tipoNotificacion;
    private String asunto;
    private String contenido;
    private String estado;          // Estado de la notificación: ENVIADA, LEIDA, FALLIDA
    private String estadoProceso;   // Estado del proceso: ELABORADO, CON_PRESUPUESTO, etc.
    private LocalDateTime fechaCreacion;
}