package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

/** E36 — PUT /contratos/{id}/registrar-planilla. CU-26, BPMN 4.7, D.S. 018-2007-TR máx 5 días. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RegistrarPlanillaRequest {
    @NotBlank @Size(max = 50) private String numeroPlanilla;
    @NotNull private LocalDate fechaRegistro;
}
