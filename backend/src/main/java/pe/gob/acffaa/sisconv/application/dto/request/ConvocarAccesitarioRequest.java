package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

/** E35 — POST /contratos/{id}/convocar-accesitario. CU-25, BPMN 4.5, RN-20/21. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConvocarAccesitarioRequest {
    @NotBlank @Size(max = 500) private String motivoConvocatoria;
}
