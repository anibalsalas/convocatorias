package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Request para Rollback Administrativo — única excepción a transiciones unidireccionales.
 * Requiere sustento obligatorio para trazabilidad legal (LOG_TRANSPARENCIA).
 * Solo roles ADMIN / ORH pueden invocar este endpoint.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RollbackAdminRequest {

    /** Estado destino del rollback. Solo se acepta "REGISTRADO" como destino válido. */
    @NotBlank(message = "El estado destino es obligatorio")
    private String estadoDestino;

    /** Sustento obligatorio — razón administrativa del rollback (mín. 10 caracteres). */
    @NotBlank(message = "El sustento es obligatorio para el rollback administrativo")
    @Size(min = 10, message = "El sustento debe tener al menos 10 caracteres")
    private String sustento;
}
