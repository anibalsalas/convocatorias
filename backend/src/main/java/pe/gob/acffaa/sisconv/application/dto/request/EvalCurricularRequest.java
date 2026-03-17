package pe.gob.acffaa.sisconv.application.dto.request;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EvalCurricularRequest {
    @NotNull @Size(min = 1) private List<EvalItem> evaluaciones;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EvalItem {
        @NotNull private Long idPostulacion;
        @NotNull @Size(min = 1) private List<FactorPuntaje> factores;
    }
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FactorPuntaje {
        @NotNull private Long idFactor;
        @NotNull private BigDecimal puntaje;
        private String observacion;
    }
}
