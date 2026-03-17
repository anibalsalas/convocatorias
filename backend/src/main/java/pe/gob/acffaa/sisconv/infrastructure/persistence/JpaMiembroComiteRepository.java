package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.MiembroComite;

public interface JpaMiembroComiteRepository extends JpaRepository<MiembroComite, Long> {
}
