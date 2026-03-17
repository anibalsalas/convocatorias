package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * DTO para validar perfil contra MPP vigente — E3 PUT /perfiles-puesto/{id}/validar.
 * Tarea BPMN: Validar Perfil contra MPP Vigente + Gateway ¿Es correcto? (Etapa 1 — ORH).
 * cumpleMpp=true → estado VALIDADO | cumpleMpp=false → estado RECHAZADO + notificación.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ValidarPerfilRequest {

    /** Resultado de validación contra MPP: true=cumple, false=no cumple */
    @NotNull(message = "El campo cumpleMpp es obligatorio")
    private Boolean cumpleMpp;

    /** Observaciones de la validación por parte de ORH */
    @Size(max = 1000, message = "Las observaciones no deben exceder 1000 caracteres")
    private String observaciones;
}
