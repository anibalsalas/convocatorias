package pe.gob.acffaa.sisconv.domain.enums;

import java.util.*;

public enum EstadoTacha {
    PRESENTADA, FUNDADA, INFUNDADA;

    private static final Map<EstadoTacha, Set<EstadoTacha>> TRANS = new EnumMap<>(EstadoTacha.class);
    static {
        TRANS.put(PRESENTADA, EnumSet.of(FUNDADA, INFUNDADA));
        TRANS.put(FUNDADA, EnumSet.noneOf(EstadoTacha.class));
        TRANS.put(INFUNDADA, EnumSet.noneOf(EstadoTacha.class));
    }
    public boolean puedeTransicionarA(EstadoTacha destino) {
        Set<EstadoTacha> permitidos = TRANS.get(this);
        return permitidos != null && permitidos.contains(destino);
    }
}
