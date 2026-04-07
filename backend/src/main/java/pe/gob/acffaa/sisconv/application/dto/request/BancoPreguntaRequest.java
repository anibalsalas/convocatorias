package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

/**
 * Request para cargar banco de preguntas — AREA_SOLICITANTE.
 * Mínimo 20, máximo 30 preguntas por convocatoria.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BancoPreguntaRequest {

    @NotNull @Size(min = 20, max = 30, message = "El banco debe contener entre 20 y 30 preguntas")
    @Valid
    private List<PreguntaItem> preguntas;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PreguntaItem {
        @NotBlank(message = "El enunciado es obligatorio")
        @Size(max = 2000)
        private String enunciado;

        @NotBlank @Size(max = 500)
        private String opcionA;

        @NotBlank @Size(max = 500)
        private String opcionB;

        @NotBlank @Size(max = 500)
        private String opcionC;

        @NotBlank @Size(max = 500)
        private String opcionD;

        @NotBlank @Pattern(regexp = "[ABCD]", message = "Respuesta correcta debe ser A, B, C o D")
        private String respuestaCorrecta;

        /** Opcional; por defecto 1.00 — RN-EV-03: ≥ 1 */
        @DecimalMin(value = "1.0", inclusive = true, message = "El puntaje por pregunta debe ser mayor o igual a 1")
        private BigDecimal puntaje;
    }
}
