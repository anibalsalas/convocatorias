package pe.gob.acffaa.sisconv.domain.enums;

/**
 * Estados de la convocatoria CAS — BPMN Etapa 2: Elaboración de Convocatoria.
 *
 * Flujo documentado (CU-06 a CU-11):
 *   EN_ELABORACION → APROBADA → PUBLICADA → EN_SELECCION
 *                                         → DESIERTA | FINALIZADA | CANCELADA
 *
 * Coherencia: CK_CONV_ESTADO, Endpoints_DTOs_v2 §3, Diagrama Flujo Etapa 2
 */
public enum EstadoConvocatoria {

    /** Estado inicial — ORH crea la convocatoria (E9). CU-06 */
    EN_ELABORACION,

    /** ORH aprueba la convocatoria (E15). CU-10 */
    APROBADA,

    /** Publicación simultánea Portal ACFFAA + Talento Perú (E15). D.S. 065-2011-PCM */
    PUBLICADA,

    /** Etapa 3 en curso — PKG-03 Proceso de Selección */
    EN_SELECCION,

    /** Convocatoria sin postulantes aptos — terminal */
    DESIERTA,

    /** Proceso completado exitosamente — terminal */
    FINALIZADA,

    /** Convocatoria cancelada administrativamente — terminal */
    CANCELADA;

    /**
     * Valida transiciones BPMN permitidas.
     */
    public boolean puedeTransicionarA(EstadoConvocatoria nuevo) {
        return switch (this) {
            case EN_ELABORACION -> nuevo == APROBADA || nuevo == CANCELADA;
            case APROBADA -> nuevo == PUBLICADA || nuevo == CANCELADA;
            case PUBLICADA -> nuevo == EN_SELECCION || nuevo == DESIERTA || nuevo == CANCELADA;
            case EN_SELECCION -> nuevo == FINALIZADA || nuevo == DESIERTA || nuevo == CANCELADA;
            case DESIERTA, FINALIZADA, CANCELADA -> false;
        };
    }
}
