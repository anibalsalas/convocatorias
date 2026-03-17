package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.Tacha;
import java.util.*;

public interface ITachaRepository {
    Tacha save(Tacha t);
    Optional<Tacha> findById(Long id);
    List<Tacha> findByConvocatoriaId(Long idConv);
    List<Tacha> findByPostulacionId(Long id);
}
