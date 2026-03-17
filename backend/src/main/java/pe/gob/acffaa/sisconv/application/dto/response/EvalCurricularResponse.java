package pe.gob.acffaa.sisconv.application.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EvalCurricularResponse {
    private Long idConvocatoria;
    private Integer totalEvaluados;
    private Integer totalAptos;
    private Integer totalNoAptos;
    private List<ResultadoItem> resultados;
    private String mensaje;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ResultadoItem {
        private Long idPostulacion;
        private String nombrePostulante;
        private BigDecimal puntajeTotal;
        private String estado;
    }
}
