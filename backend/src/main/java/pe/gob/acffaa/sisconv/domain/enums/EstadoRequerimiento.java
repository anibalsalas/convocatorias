package pe.gob.acffaa.sisconv.domain.enums;

/**
 * Estados del requerimiento de personal CAS — BPMN Etapa 1: Requerimiento de Personal.
 *
 * Flujo documentado (CU-03, CU-04, CU-05):
 *   ELABORADO → CON_PRESUPUESTO → CONFIGURADO  (flujo exitoso)
 *   ELABORADO → SIN_PRESUPUESTO                 (terminal — fin sin recursos)
 *
 * Coherencia: Endpoints_DTOs_v2 §2, Vista CU (CU-03/04/05), Diagrama Flujo Etapa 1
 *
 * @see pe.gob.acffaa.sisconv.presentation.controller.RequerimientoController
 */
public enum EstadoRequerimiento {

    /**
     * Estado inicial — Área Solicitante crea el requerimiento (E6).
     * CU-03: "Estado inicial: ELABORADO"
     */
    ELABORADO,

    /**
     * OPP verificó disponibilidad presupuestal positiva (E7).
     * CU-04: "Emite certificación, registra SIAF → CON_PRESUPUESTO"
     */
    CON_PRESUPUESTO,

    /**
     * OPP verificó que NO hay presupuesto — estado terminal (E7).
     * CU-04 FA-01: "Sin presupuesto → SIN_PRESUPUESTO → Evento fin error"
     */
    SIN_PRESUPUESTO,

    /**
     * ORH configuró Motor de Reglas RF-14 — Conformidad, listo para Etapa 2 (E8).
     * CU-05: "Pesos y umbrales configurados → CONFIGURADO (Conformidad)"
     */
    CONFIGURADO;

    /**
     * Valida si la transición de estado es permitida según el flujo BPMN documentado.
     *
     * Transiciones válidas:
     *   ELABORADO        → CON_PRESUPUESTO (OPP aprueba) | SIN_PRESUPUESTO (OPP rechaza)
     *   CON_PRESUPUESTO  → CONFIGURADO (ORH configura Motor RF-14)
     *   SIN_PRESUPUESTO  → (terminal — no hay transiciones)
     *   CONFIGURADO      → (terminal — pasa a Etapa 2 / PKG-02)
     *
     * @param nuevo Estado destino
     * @return true si la transición es válida según BPMN
     */
    public boolean puedeTransicionarA(EstadoRequerimiento nuevo) {
        return switch (this) {
            case ELABORADO -> nuevo == CON_PRESUPUESTO || nuevo == SIN_PRESUPUESTO;
            case CON_PRESUPUESTO -> nuevo == CONFIGURADO;
            case SIN_PRESUPUESTO, CONFIGURADO -> false; // Estados terminales
        };
    }
}
