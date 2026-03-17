package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PerfilExperienciaRequest {

    @NotBlank(message = "El tipo de experiencia es obligatorio")
    @Size(max = 30, message = "El tipo de experiencia no debe exceder 30 caracteres")
    private String tipoExperiencia;

    @NotNull(message = "La cantidad es obligatoria")
    @Min(value = 1, message = "La cantidad debe ser mayor a 0")
    private Integer cantidad;

    @NotBlank(message = "La unidad de tiempo es obligatoria")
    @Size(max = 10, message = "La unidad de tiempo no debe exceder 10 caracteres")
    private String unidadTiempo;

    @NotBlank(message = "El nivel mínimo del puesto es obligatorio")
    @Size(max = 120, message = "El nivel mínimo del puesto no debe exceder 120 caracteres")
    private String nivelMinimoPuesto;

    @NotBlank(message = "El detalle de la experiencia es obligatorio")
    @Size(max = 1000, message = "El detalle no debe exceder 1000 caracteres")
    private String detalle;

    private Integer orden;
}
