package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.CuadroMeritos;
import java.util.*;

public interface ICuadroMeritosRepository {
    CuadroMeritos save(CuadroMeritos c);
    List<CuadroMeritos> saveAll(List<CuadroMeritos> list);
    List<CuadroMeritos> findByConvocatoriaId(Long idConv);
    Optional<CuadroMeritos> findByPostulacionId(Long id);
}
