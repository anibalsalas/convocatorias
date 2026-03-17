package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * DTO de entrada para E6: Crear requerimiento de contratación CAS.
 * Tarea BPMN: Elaborar Requerimiento de Contratación (Etapa 1 — Área Solicitante).
 * CU-03: "Selecciona perfil aprobado, registra justificación y cantidad de puestos."
 *
 * Coherencia: Endpoints_DTOs_v2 §2 E6 Request
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class RequerimientoRequest {

    @NotNull(message = "ID del perfil de puesto es obligatorio")
    private Long idPerfilPuesto;

    @NotNull(message = "ID del área solicitante es obligatorio")
    private Long idAreaSolicitante;

    @NotBlank(message = "Justificación es obligatoria — D.S. 075-2008-PCM Art. 3")
    @Size(max = 2000, message = "Justificación no debe exceder 2000 caracteres")
    private String justificacion;

    /** Cantidad de puestos a cubrir (default 1) */
    @NotNull(message = "Cantidad de puestos es obligatoria")
    @Min(value = 1, message = "Cantidad mínima es 1 puesto")
    private Integer cantidadPuestos;
}
