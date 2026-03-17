package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostulanteFormacionAcademicaRequest {

    @NotBlank(message = "La formación académica es obligatoria")
    @Size(max = 50, message = "La formación académica no debe exceder 50 caracteres")
    private String formacionAcademica;

    @NotBlank(message = "El nivel alcanzado es obligatorio")
    @Size(max = 50, message = "El nivel alcanzado no debe exceder 50 caracteres")
    private String nivelAlcanzado;

    @NotBlank(message = "La carrera es obligatoria")
    @Size(max = 200, message = "La carrera no debe exceder 200 caracteres")
    private String carrera;

    @NotBlank(message = "La universidad o centro de estudios es obligatorio")
    @Size(max = 250, message = "El centro de estudios no debe exceder 250 caracteres")
    private String centroEstudios;

    @NotNull(message = "La fecha de expedición es obligatoria")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate fechaExpedicion;
}