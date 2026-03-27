package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

/**
 * DTO para actualización parcial de convocatoria por ORH — PUT /convocatorias/{id}.
 * Solo se permiten modificar los campos editables por ORH (D.S. 075-2008-PCM).
 * Los datos heredados del requerimiento (pesos Motor RF-14, estado) son ignorados.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConvocatoriaUpdateRequest {

    @NotBlank(message = "descripcion es obligatoria")
    @Size(max = 500)
    private String descripcion;

    @Size(max = 2000)
    private String objetoContratacion;

    // ── Campos V17: editables por ORH para completar información de postulación ──

    @Size(max = 300)
    private String dependenciaEncargadaProceso;

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
