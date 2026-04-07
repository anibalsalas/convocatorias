package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.ConfigExamen;
import java.util.Optional;

public interface JpaConfigExamenRepository extends JpaRepository<ConfigExamen, Long> {
    Optional<ConfigExamen> findByConvocatoriaIdConvocatoria(Long idConv);
}
