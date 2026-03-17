package pe.gob.acffaa.sisconv.application.dto.request;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TachaRequest {
    @NotNull private Long idPostulacion;
    @NotBlank private String motivo;
    private String evidencia;
    private String rutaAdjunto;
}
