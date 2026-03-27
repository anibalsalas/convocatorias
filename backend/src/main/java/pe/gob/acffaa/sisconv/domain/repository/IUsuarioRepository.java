package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.Usuario;
import java.util.Optional;
import java.util.List;

/**
 * Puerto de repositorio para Usuario — SAD §3.1 Dependency Rule
 * Interface en domain/, implementación en infrastructure/persistence/
 * SAD §3.3 SOLID-D: Services dependen de abstracciones, no de implementaciones
 */
public interface IUsuarioRepository {
    Optional<Usuario> findByUsername(String username);
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findById(Long id);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<Usuario> findAllActive();
    List<Usuario> findAll();
    Usuario save(Usuario usuario);
}
