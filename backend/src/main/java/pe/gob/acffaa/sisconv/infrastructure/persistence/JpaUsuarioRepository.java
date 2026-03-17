package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import java.util.Optional;
import java.util.List;

/**
 * Implementación JPA del puerto IUsuarioRepository — SAD §3.3 SOLID-L: Liskov Substitution
 * SAD §3.2: infrastructure/persistence/ implementa interfaces de domain/repository/
 */
public interface JpaUsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);
    Optional<Usuario> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    @Query("SELECT u FROM Usuario u WHERE u.estado = 'ACTIVO' ORDER BY u.apellidos, u.nombres")
    List<Usuario> findAllActive();
}
