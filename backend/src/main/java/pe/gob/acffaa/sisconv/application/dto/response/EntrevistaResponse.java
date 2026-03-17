package pe.gob.acffaa.sisconv.application.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EntrevistaResponse {
    private Long idConvocatoria;
    private Integer totalEntrevistados;
    private Boolean quorumGlobal;
    private List<ResultadoEntItem> resultados;
    private String mensaje;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ResultadoEntItem {
        private Long idPostulacion;
        private String nombrePostulante;
        private BigDecimal puntajePromedio;
        private Boolean quorumAlcanzado;
    }
}
