package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

/** E32 — POST /contratos/{id}/notificar-ganador. CU-23, BPMN 4.1, RF-17. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificarGanadorRequest {
    @NotNull private Long idConvocatoria;
    @NotNull private Long idPostulacion;
    @NotNull @Min(1) @Max(30) private Integer plazoDocumentosDias;
    private String mensajeAdicional;
}
