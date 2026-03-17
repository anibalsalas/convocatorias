package pe.gob.acffaa.sisconv.application.dto.request;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ResolverTachaRequest {
    @NotBlank private String estado;
    @NotBlank private String resolucion;
}
