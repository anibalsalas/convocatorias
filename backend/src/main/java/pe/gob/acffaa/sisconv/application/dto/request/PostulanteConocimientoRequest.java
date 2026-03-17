package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostulanteConocimientoRequest {

    @NotBlank(message = "El tipo de conocimiento es obligatorio")
    @Size(max = 30, message = "El tipo de conocimiento no debe exceder 30 caracteres")
    private String tipoConocimiento;

    @NotBlank(message = "La descripción es obligatoria")
    @Size(max = 300, message = "La descripción no debe exceder 300 caracteres")
    private String descripcion;

    @NotBlank(message = "El nivel es obligatorio")
    @Size(max = 30, message = "El nivel no debe exceder 30 caracteres")
    private String nivel;

    @Size(max = 100, message = "El tipo de ofimática no debe exceder 100 caracteres")
    private String tipoOfimatica;

    @Size(max = 200, message = "La institución no debe exceder 200 caracteres")
    private String institucion;

    @Positive(message = "Las horas deben ser mayores a cero")
    @Max(value = 9999, message = "Las horas académicas no deben exceder 4 dígitos")
    private Integer horas;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate fechaInicio;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate fechaFin;
}