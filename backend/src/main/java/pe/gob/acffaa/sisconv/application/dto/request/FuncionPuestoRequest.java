package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * DTO para funciones del puesto CAS.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class FuncionPuestoRequest {

    @NotBlank(message = "Descripción de la función es obligatoria")
    @Size(max = 500, message = "Descripción no debe exceder 500 caracteres")
    private String descripcionFuncion;

    private Integer orden = 0;
}
