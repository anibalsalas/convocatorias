package pe.gob.acffaa.sisconv.application.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FactorEvaluacionResponse {
    private Long idConvocatoria;
    private Integer factoresRegistrados;
    private String mensaje;
}
