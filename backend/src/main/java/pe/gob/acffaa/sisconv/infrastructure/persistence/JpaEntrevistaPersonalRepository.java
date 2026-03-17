package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.EntrevistaPersonal;
import java.util.Optional;
public interface JpaEntrevistaPersonalRepository extends JpaRepository<EntrevistaPersonal,Long>{
    Optional<EntrevistaPersonal> findByPostulacionIdPostulacion(Long id);
}
