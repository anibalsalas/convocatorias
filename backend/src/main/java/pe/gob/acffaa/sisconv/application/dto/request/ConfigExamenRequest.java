package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Request para configurar examen virtual — ORH.
 * No incluye contenido de preguntas.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConfigExamenRequest {

    @NotNull(message = "La fecha/hora de inicio es obligatoria")
    private LocalDateTime fechaHoraInicio;

    @NotNull(message = "La fecha/hora de fin es obligatoria")
    private LocalDateTime fechaHoraFin;

    @Min(value = 1, message = "La cantidad de preguntas debe ser al menos 1")
    @Max(value = 30, message = "La cantidad no puede exceder el tamaño del banco")
    private Integer cantidadPreguntas;

    /** Ignorado: el backend calcula minutos entre fechaHoraFin y fechaHoraInicio (5–180). */
    @Deprecated
    private Integer duracionMinutos;

    /** Ignorado: el backend fuerza mostrar resultado al postulante (política E26-V). */
    @Deprecated
    private Boolean mostrarResultado;
}
