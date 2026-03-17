package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * DTO para aprobar perfil de puesto — E4 PUT /perfiles-puesto/{id}/aprobar.
 * Tarea BPMN: Aprobar Perfil + Notificar Aprobación (Etapa 1 — ORH).
 * Precondición: perfil debe estar en estado VALIDADO.
 * Postcondición: estado APROBADO, genera notificación + log transparencia.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AprobarPerfilRequest {

    /** true=aprobar, false=rechazar en etapa de aprobación */
    @NotNull(message = "El campo aprobado es obligatorio")
    private Boolean aprobado;

    /** Observaciones de aprobación o motivo de rechazo */
    @Size(max = 1000, message = "Las observaciones no deben exceder 1000 caracteres")
    private String observaciones;
}
