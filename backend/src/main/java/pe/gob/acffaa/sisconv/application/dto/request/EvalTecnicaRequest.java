package pe.gob.acffaa.sisconv.application.dto.request;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EvalTecnicaRequest {
    @NotNull @Size(min = 1) private List<EvalTecItem> evaluaciones;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EvalTecItem {
        @NotBlank private String codigoAnonimo;
        @NotNull private BigDecimal puntaje;
        private String observacion;
    }
}
