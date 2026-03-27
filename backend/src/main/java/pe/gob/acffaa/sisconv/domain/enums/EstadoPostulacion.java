package pe.gob.acffaa.sisconv.domain.enums;

import java.util.*;

/**
 * Estados de postulación — CK_POST_ESTADO DDL_NEW.sql
 * 8 estados válidos en Oracle CHECK constraint.
 * Flujo correcto:
 *   E17: POSTULACION → REGISTRADO
 *   E19: solo graba flags DL1451, NO cambia estado
 *   E20: REGISTRADO → VERIFICADO (SIN_SANCIONES) | NO_APTO (CON_SANCIONES)
 *   E24: VERIFICADO → APTO | NO_APTO
 *   E29: APTO → GANADOR | ACCESITARIO | NO_SELECCIONADO
 */
public enum EstadoPostulacion {
    REGISTRADO, VERIFICADO, APTO, NO_APTO,
    DESCALIFICADO, GANADOR, ACCESITARIO, NO_SELECCIONADO;

    private static final Map<EstadoPostulacion, Set<EstadoPostulacion>> TRANS = new EnumMap<>(EstadoPostulacion.class);
    static {
        // FIX #1: REGISTRADO → NO_APTO (D.L. 1451 sanciones E19/E20)
        // E19: REGISTRADO → APTO directo cuando D.L. 1451 ambos SIN_SANCIONES
        TRANS.put(REGISTRADO, EnumSet.of(VERIFICADO, APTO, NO_APTO, DESCALIFICADO));
        TRANS.put(VERIFICADO, EnumSet.of(APTO, NO_APTO, DESCALIFICADO));
        // FIX #2: APTO → NO_APTO (eval técnica reprobada E26)
        TRANS.put(APTO, EnumSet.of(VERIFICADO, GANADOR, ACCESITARIO, NO_SELECCIONADO, NO_APTO, DESCALIFICADO));
        TRANS.put(NO_APTO, EnumSet.noneOf(EstadoPostulacion.class));
        TRANS.put(DESCALIFICADO, EnumSet.noneOf(EstadoPostulacion.class));
        // Re-cálculo E29: GANADOR/ACCESITARIO/NO_SELECCIONADO pueden volver a cualquier resultado final (RF-16 corregido)
        TRANS.put(GANADOR, EnumSet.of(GANADOR, ACCESITARIO, NO_SELECCIONADO));
        TRANS.put(ACCESITARIO, EnumSet.of(GANADOR, ACCESITARIO, NO_SELECCIONADO));
        TRANS.put(NO_SELECCIONADO, EnumSet.of(GANADOR, ACCESITARIO, NO_SELECCIONADO));
    }

    public boolean puedeTransicionarA(EstadoPostulacion destino) {
        Set<EstadoPostulacion> permitidos = TRANS.get(this);
        return permitidos != null && permitidos.contains(destino);
    }
}
