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
public class PerfilFormacionAcademicaRequest {

    @NotBlank(message = "La formación académica es obligatoria")
    @Size(max = 500, message = "La formación académica no debe exceder 500 caracteres")
    private String gradoAcademico;

    @Size(max = 200, message = "La especialidad no debe exceder 200 caracteres")
    private String especialidad;

    private Boolean requiereColegiatura;

    private Boolean requiereHabilitacionProfesional;

    private Integer orden;
}
