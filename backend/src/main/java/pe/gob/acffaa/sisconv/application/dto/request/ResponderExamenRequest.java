package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;

/**
 * Request del postulante al enviar respuestas del examen virtual.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ResponderExamenRequest {

    @NotNull @Valid
    private List<RespuestaItem> respuestas;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RespuestaItem {
        @NotNull
        private Long idPregunta;

        /** A, B, C, D o null si no respondió */
        @Pattern(regexp = "[ABCD]", message = "La respuesta debe ser A, B, C o D")
        private String respuesta;
    }
}
