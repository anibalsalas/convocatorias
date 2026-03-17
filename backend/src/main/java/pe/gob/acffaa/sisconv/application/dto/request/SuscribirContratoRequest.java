package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** E34 — POST /contratos/{id}/suscribir. CU-24, BPMN 4.6, D.Leg. 1057 firma bilateral. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SuscribirContratoRequest {
    @NotNull private LocalDate fechaInicio;
    @NotNull private LocalDate fechaFin;
    @NotNull @DecimalMin("0.01") private BigDecimal montoMensual;
    @NotBlank @Size(max = 2000) private String funciones;
    @NotBlank @Size(max = 200) private String dependencia;
}
