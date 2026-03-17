package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

/**
 * E9 Request — POST /convocatorias — Crear convocatoria CAS.
 * CU-06: idRequerimiento debe estar CONFIGURADO.
 * numeroConvocatoria es opcional y solo se usa cuando el frontend reservó
 * un correlativo mediante SEQ_NUM_CONVOCATORIA para mostrarlo en modo readonly.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConvocatoriaRequest {

    @NotNull(message = "idRequerimiento es obligatorio")
    private Long idRequerimiento;

    @Size(max = 30)
    private String numeroConvocatoria;

    @NotBlank(message = "descripcion es obligatoria")
    @Size(max = 500)
    private String descripcion;

    @Size(max = 2000)
    private String objetoContratacion;

    private LocalDate fechaPublicacion;

    @NotNull(message = "fechaIniPostulacion es obligatoria")
    private LocalDate fechaIniPostulacion;

    @NotNull(message = "fechaFinPostulacion es obligatoria")
    private LocalDate fechaFinPostulacion;

    private LocalDate fechaEvaluacion;
    private LocalDate fechaResultado;
}
