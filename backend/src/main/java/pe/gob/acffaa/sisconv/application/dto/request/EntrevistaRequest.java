package pe.gob.acffaa.sisconv.application.dto.request;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EntrevistaRequest {
    @NotNull @Size(min = 1) private List<EntrevistaItem> entrevistas;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EntrevistaItem {
        @NotNull private Long idPostulacion;
        @NotNull @Size(min = 1) private List<MiembroPuntaje> puntajesMiembros;
    }
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MiembroPuntaje {
        @NotNull private Long idMiembroComite;
        @NotNull private BigDecimal puntaje;
        private String observacion;
    }
}
