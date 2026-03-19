package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;
import java.util.List;

/**
 * E10 Request — POST /convocatorias/{id}/cronograma.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CronogramaRequest {

    @NotEmpty(message = "Debe incluir al menos una actividad")
    @Valid
    private List<ActividadItem> actividades;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ActividadItem {
        @NotBlank private String etapa;
        @NotBlank private String actividad;
        @NotNull  private LocalDate fechaInicio;
        @NotNull  private LocalDate fechaFin;
        private String responsable;
        private String lugar;
        private Integer orden;
        private String areaResp1;
        private String areaResp2;
        private String areaResp3;
    }
}
