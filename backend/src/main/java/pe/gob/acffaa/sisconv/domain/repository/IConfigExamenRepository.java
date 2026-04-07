package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.ConfigExamen;
import java.util.Optional;

public interface IConfigExamenRepository {
    ConfigExamen save(ConfigExamen c);
    Optional<ConfigExamen> findByConvocatoriaId(Long idConv);
}
