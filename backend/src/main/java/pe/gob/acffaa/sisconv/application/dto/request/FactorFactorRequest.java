package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * Request para CRUD individual de factores de evaluación.
 * POST /convocatorias/{id}/factores
 * PUT  /convocatorias/{id}/factores/{idFactor}
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FactorFactorRequest {

    @NotBlank(message = "etapaEvaluacion es obligatorio")
    private String etapaEvaluacion;

    @NotBlank(message = "criterio es obligatorio")
    private String criterio;

    /** Para subcriterios: ID del factor padre (fase). Null = fase principal. */
    private Long idFactorPadre;

    @NotNull private BigDecimal puntajeMaximo;
    private BigDecimal puntajeMinimo;

    @NotNull private BigDecimal pesoCriterio;
    private Integer orden;
    private String descripcion;
}
