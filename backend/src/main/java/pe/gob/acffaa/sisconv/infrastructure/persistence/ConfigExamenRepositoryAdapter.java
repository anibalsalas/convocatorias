package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.ConfigExamen;
import pe.gob.acffaa.sisconv.domain.repository.IConfigExamenRepository;
import java.util.Optional;

@Repository
public class ConfigExamenRepositoryAdapter implements IConfigExamenRepository {
    private final JpaConfigExamenRepository jpa;
    public ConfigExamenRepositoryAdapter(JpaConfigExamenRepository j) { this.jpa = j; }

    @Override public ConfigExamen save(ConfigExamen c) { return jpa.save(c); }
    @Override public Optional<ConfigExamen> findByConvocatoriaId(Long id) { return jpa.findByConvocatoriaIdConvocatoria(id); }
}
