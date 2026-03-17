package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.time.LocalDate;

/**
 * Response para registro en planilla electrónica (E36).
 * D.S. 018-2007-TR: máximo 5 días hábiles desde suscripción.
 *
 * Coherencia: Endpoints_DTOs_v2 §5 (E36), BPMN 4.7
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlanillaResponse {
    private Long idContrato;
    private Boolean registroPlanilla;
    private String numeroPlanilla;
    private LocalDate fechaRegPlanilla;
    private String mensaje;
}
