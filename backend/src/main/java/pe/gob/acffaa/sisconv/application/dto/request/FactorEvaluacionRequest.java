package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

/**
 * E12 Request — POST /convocatorias/{id}/factores.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FactorEvaluacionRequest {

    @NotEmpty(message = "Debe incluir al menos un factor")
    @Valid
    private List<FactorItem> factores;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FactorItem {
        @NotBlank private String etapaEvaluacion;
        @NotBlank private String criterio;
        @NotNull  private BigDecimal puntajeMaximo;
        private BigDecimal puntajeMinimo;
        @NotNull  private BigDecimal pesoCriterio;
        private Integer orden;
        private String descripcion;
    }
}
