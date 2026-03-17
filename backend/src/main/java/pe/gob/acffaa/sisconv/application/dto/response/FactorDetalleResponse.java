package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

/**
 * DTO detalle de un factor de evaluación (fase o subcriterio).
 * Usado por GET /convocatorias/{id}/factores y CRUD individual.
 * subcriterios: lista de subcriterios cuando es fase principal (idFactorPadre == null).
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FactorDetalleResponse {

    private Long idFactor;
    private Long idConvocatoria;
    private Long idFactorPadre;
    private String etapaEvaluacion;
    private String criterio;
    private BigDecimal puntajeMaximo;
    private BigDecimal puntajeMinimo;
    private BigDecimal pesoCriterio;
    private Integer orden;
    private String descripcion;
    private String estado;
    private List<FactorDetalleResponse> subcriterios;
}
