package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PerfilConocimientoRequest {

    @NotBlank(message = "El tipo de conocimiento es obligatorio")
    @Size(max = 30, message = "El tipo de conocimiento no debe exceder 30 caracteres")
    private String tipoConocimiento;

    @NotBlank(message = "La descripción del conocimiento es obligatoria")
    @Size(max = 300, message = "La descripción no debe exceder 300 caracteres")
    private String descripcion;

    private Integer horas;

    @Size(max = 30, message = "El nivel de dominio no debe exceder 30 caracteres")
    private String nivelDominio;

    private Integer orden;
}
