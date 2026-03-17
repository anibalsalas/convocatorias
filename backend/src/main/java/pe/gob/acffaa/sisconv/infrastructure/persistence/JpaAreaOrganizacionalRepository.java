package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.AreaOrganizacional;

/**
 * Repositorio JPA para TBL_AREA_ORGANIZACIONAL.
 */
public interface JpaAreaOrganizacionalRepository extends JpaRepository<AreaOrganizacional, Long> {
}
