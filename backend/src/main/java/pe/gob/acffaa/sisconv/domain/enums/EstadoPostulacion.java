package pe.gob.acffaa.sisconv.domain.enums;

import java.util.*;

/**
 * Estados de postulación — CK_POST_ESTADO DDL_NEW.sql
 * 8 estados válidos en Oracle CHECK constraint.
 * Flujo: REGISTRADO → VERIFICADO → APTO/NO_APTO → GANADOR/ACCESITARIO/NO_SELECCIONADO
 */
public enum EstadoPostulacion {
    REGISTRADO, VERIFICADO, APTO, NO_APTO,
    DESCALIFICADO, GANADOR, ACCESITARIO, NO_SELECCIONADO;

    private static final Map<EstadoPostulacion, Set<EstadoPostulacion>> TRANS = new EnumMap<>(EstadoPostulacion.class);
    static {
        // FIX #1: REGISTRADO → NO_APTO (D.L. 1451 sanciones E19/E20)
        TRANS.put(REGISTRADO, EnumSet.of(VERIFICADO, NO_APTO, DESCALIFICADO));
        TRANS.put(VERIFICADO, EnumSet.of(APTO, NO_APTO, DESCALIFICADO));
        // FIX #2: APTO → NO_APTO (eval técnica reprobada E26)
        TRANS.put(APTO, EnumSet.of(GANADOR, ACCESITARIO, NO_SELECCIONADO, NO_APTO, DESCALIFICADO));
        TRANS.put(NO_APTO, EnumSet.noneOf(EstadoPostulacion.class));
        TRANS.put(DESCALIFICADO, EnumSet.noneOf(EstadoPostulacion.class));
        TRANS.put(GANADOR, EnumSet.noneOf(EstadoPostulacion.class));
        TRANS.put(ACCESITARIO, EnumSet.of(GANADOR));
        TRANS.put(NO_SELECCIONADO, EnumSet.noneOf(EstadoPostulacion.class));
    }

    public boolean puedeTransicionarA(EstadoPostulacion destino) {
        Set<EstadoPostulacion> permitidos = TRANS.get(this);
        return permitidos != null && permitidos.contains(destino);
    }
}
