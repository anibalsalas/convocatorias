package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.Rol;
import java.util.Optional;
import java.util.List;

/**
 * Implementación JPA del puerto IRolRepository
 */
public interface JpaRolRepository extends JpaRepository<Rol, Long> {
    Optional<Rol> findByCodigoRol(String codigoRol);
    List<Rol> findByEstado(String estado);
}
