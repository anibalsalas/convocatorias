package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

/**
 * Response E24 — Evaluación Curricular RF-09.
 * umbralAplicado: valor real leído de TBL_REGLA_MOTOR.UMBRAL_MINIMO (etapa CURRICULAR).
 * Permite al frontend mostrar el umbral dinámico en lugar de un valor hardcodeado.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EvalCurricularResponse {
    private Long idConvocatoria;
    private Integer totalEvaluados;
    private Integer totalAptos;
    private Integer totalNoAptos;
    private List<ResultadoItem> resultados;
    /** Umbral real aplicado por el Motor RF-14 (TBL_REGLA_MOTOR.UMBRAL_MINIMO) */
    private BigDecimal umbralAplicado;
    private String mensaje;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ResultadoItem {
        private Long idPostulacion;
        private String nombrePostulante;
        private BigDecimal puntajeTotal;
        private String estado;
    }
}
