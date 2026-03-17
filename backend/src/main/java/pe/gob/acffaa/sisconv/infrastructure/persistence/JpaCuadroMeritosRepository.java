package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.CuadroMeritos;
import java.util.*;
public interface JpaCuadroMeritosRepository extends JpaRepository<CuadroMeritos,Long>{
    List<CuadroMeritos> findByConvocatoriaIdConvocatoria(Long ic);
    Optional<CuadroMeritos> findByPostulacionIdPostulacion(Long id);
}
