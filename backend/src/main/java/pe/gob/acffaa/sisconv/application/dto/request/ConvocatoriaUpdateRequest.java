package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * DTO para actualización parcial de convocatoria por ORH — PUT /convocatorias/{id}.
 * Solo se permiten modificar los campos editables por ORH (D.S. 075-2008-PCM).
 * Los datos heredados del requerimiento (pesos Motor RF-14, estado) son ignorados.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConvocatoriaUpdateRequest {

    @NotBlank(message = "descripcion es obligatoria")
    @Size(max = 500)
    private String descripcion;

    @Size(max = 2000)
    private String objetoContratacion;
}
