package pe.gob.acffaa.sisconv.application.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BonificacionResponse {
    private Long idConvocatoria;
    private Integer totalBonificados;
    private List<BonifItem> bonificaciones;
    private String mensaje;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BonifItem {
        private Long idPostulacion;
        private String nombrePostulante;
        private String tipoBonificacion;
        private BigDecimal porcentaje;
        private BigDecimal puntajeBase;
        private BigDecimal puntajeAplicado;
        private String baseLegal;
    }
}
