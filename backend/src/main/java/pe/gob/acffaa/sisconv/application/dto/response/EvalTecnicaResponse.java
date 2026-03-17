package pe.gob.acffaa.sisconv.application.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EvalTecnicaResponse {
    private Long idConvocatoria;
    private Integer totalEvaluados;
    private List<ResultadoTecItem> resultados;
    private String mensaje;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ResultadoTecItem {
        private String codigoAnonimo;
        private BigDecimal puntaje;
        private String estado;
    }
}
