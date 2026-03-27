package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

/**
 * Response E26 — Evaluación Técnica Anónima RF-11.
 * umbralAplicado: valor real leído de TBL_REGLA_MOTOR.UMBRAL_MINIMO (etapa TECNICA).
 * Permite al frontend mostrar el umbral dinámico — corrección del hardcode "60.00".
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EvalTecnicaResponse {
    private Long idConvocatoria;
    private Integer totalEvaluados;
    private List<ResultadoTecItem> resultados;
    /** Umbral real aplicado por el Motor RF-14 (TBL_REGLA_MOTOR.UMBRAL_MINIMO) */
    private BigDecimal umbralAplicado;
    private String mensaje;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ResultadoTecItem {
        private String codigoAnonimo;
        private BigDecimal puntaje;
        private String estado;
    }
}
