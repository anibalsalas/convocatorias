package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

/** E37 — PUT /contratos/{id}/cerrar. CU-25/26, BPMN 4.8, RN-26 log transparencia. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CerrarProcesoRequest {
    /** FINALIZADO o DESIERTO */
    @NotBlank @Pattern(regexp = "FINALIZADO|DESIERTO") private String procesoEstado;
    @Size(max = 1000) private String observaciones;
}
