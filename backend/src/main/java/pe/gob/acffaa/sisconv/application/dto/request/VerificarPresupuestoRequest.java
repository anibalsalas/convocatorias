package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * DTO de entrada para E7: Verificación presupuestal OPP.
 * Tarea BPMN: Gateway ¿Existen recursos? + Emitir Certificación + Registrar SIAF (Etapa 1 — OPP).
 * CU-04: "OPP verifica disponibilidad presupuestal."
 *
 * Coherencia: Endpoints_DTOs_v2 §2 E7 Request
 *
 * Si existePresupuesto=true → certificacionPresupuestal y numeroSiaf son obligatorios.
 * Si existePresupuesto=false → estado terminal SIN_PRESUPUESTO, proceso finaliza.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class VerificarPresupuestoRequest {

    @NotNull(message = "existePresupuesto es obligatorio")
    private Boolean existePresupuesto;

    /** Número de certificación emitida por OPP — obligatorio si existePresupuesto=true */
    private String certificacionPresupuestal;

    /** Número de operación SIAF-SP — obligatorio si existePresupuesto=true */
    private String numeroSiaf;

    @Size(max = 1000, message = "Observaciones no debe exceder 1000 caracteres")
    private String observaciones;
}
