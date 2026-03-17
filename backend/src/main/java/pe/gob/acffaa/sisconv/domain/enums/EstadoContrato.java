package pe.gob.acffaa.sisconv.domain.enums;

/**
 * Estados del contrato CAS — BPMN Etapa 4: Suscripción y Registro.
 *
 * Statechart (DiagramaFlujo_04):
 *   NOTIFICADO → DOCS_VERIFICADOS → SUSCRITO → EN_PLANILLA → CERRADO
 *              → (docs inválidos/no presenta) → se cierra este contrato,
 *                se crea nuevo con accesitario (E35)
 *
 * procesoEstado es campo separado: EN_CURSO | FINALIZADO | DESIERTO
 *
 * Normativa: D.Leg. 1057, D.S. 075-2008-PCM, D.S. 018-2007-TR
 * Coherencia: Endpoints_DTOs_v2 §5 (E32-E37), AF §6.2 (RN-20 a RN-26)
 */
public enum EstadoContrato {

    /** E32 — ORH notifica al ganador (BPMN 4.1) */
    NOTIFICADO,

    /** E33 — Documentos verificados conformes (BPMN 4.4) */
    DOCS_VERIFICADOS,

    /** E34 — Contrato CAS firmado bilateral (BPMN 4.6, D.Leg. 1057) */
    SUSCRITO,

    /** E36 — Registrado en planilla electrónica (BPMN 4.7, D.S. 018-2007-TR) */
    EN_PLANILLA,

    /** E37 — Proceso cerrado FINALIZADO o DESIERTO (BPMN 4.8) */
    CERRADO,

    /** Contrato cancelado (ganador no presentó docs / docs inválidos) */
    CANCELADO;

    /**
     * Valida transiciones BPMN permitidas del contrato.
     */
    public boolean puedeTransicionarA(EstadoContrato nuevo) {
        return switch (this) {
            case NOTIFICADO -> nuevo == DOCS_VERIFICADOS || nuevo == CANCELADO;
            case DOCS_VERIFICADOS -> nuevo == SUSCRITO || nuevo == CANCELADO;
            case SUSCRITO -> nuevo == EN_PLANILLA;
            case EN_PLANILLA -> nuevo == CERRADO;
            case CERRADO, CANCELADO -> false;
        };
    }
}
