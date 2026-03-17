package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostulanteExperienciaRequest {

    @NotBlank(message = "El tipo de experiencia es obligatorio")
    @Size(max = 20, message = "El tipo de experiencia no debe exceder 20 caracteres")
    private String tipoExperiencia;

    @NotBlank(message = "El tipo de sector es obligatorio")
    @Size(max = 20, message = "El tipo de sector no debe exceder 20 caracteres")
    private String tipoSector;

    @NotBlank(message = "La institución es obligatoria")
    @Size(max = 250, message = "La institución no debe exceder 250 caracteres")
    private String institucion;

    @NotBlank(message = "El puesto es obligatorio")
    @Size(max = 250, message = "El puesto no debe exceder 250 caracteres")
    private String puesto;

    @NotBlank(message = "El nivel es obligatorio")
    @Size(max = 120, message = "El nivel no debe exceder 120 caracteres")
    private String nivel;

    @NotBlank(message = "Las funciones son obligatorias")
    @Size(max = 4000, message = "Las funciones no deben exceder 4000 caracteres")
    private String funciones;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate fechaInicio;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate fechaFin;
}