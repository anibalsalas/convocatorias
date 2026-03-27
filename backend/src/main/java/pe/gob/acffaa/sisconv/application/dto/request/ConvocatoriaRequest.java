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

    private LocalDate fechaIniPostulacion;

    private LocalDate fechaFinPostulacion;

    private LocalDate fechaEvaluacion;
    private LocalDate fechaResultado;

    // ── Campos V17: canal de postulación y dependencia encargada ──

    @Size(max = 300)
    private String dependenciaEncargadaProceso;

    /** CORREO, PRESENCIAL, VIRTUAL o MIXTO */
    @Pattern(regexp = "^(CORREO|PRESENCIAL|VIRTUAL|MIXTO)$",
             message = "Canal de postulación debe ser CORREO, PRESENCIAL, VIRTUAL o MIXTO")
    private String canalPostulacion;

    @Email(message = "Correo de postulación inválido")
    @Size(max = 200)
    private String correoPostulacion;

    @Min(value = 1, message = "Tamaño mínimo 1 MB")
    @Max(value = 500, message = "Tamaño máximo 500 MB")
    private Integer maxTamanoArchivoMb;

    @Size(max = 500)
    private String formatoNombreArchivo;

    @Size(max = 300)
    private String formatoAsuntoPostulacion;
}
