package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request para CRUD individual de miembros del comité.
 * POST /convocatorias/{id}/comite/miembros
 * PUT  /convocatorias/{id}/comite/miembros/{idMiembro}
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MiembroComiteRequest {

    @NotBlank(message = "nombresCompletos es obligatorio")
    private String nombresCompletos;

    private String cargo;

    @NotBlank(message = "rolComite es obligatorio")
    private String rolComite;

    private Boolean esTitular;
}
