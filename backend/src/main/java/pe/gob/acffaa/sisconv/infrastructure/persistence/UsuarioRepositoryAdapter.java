package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;
import java.util.Optional;
import java.util.List;

/**
 * Adapter: conecta la interfaz de dominio IUsuarioRepository con JPA
 * SAD §3.3 SOLID-D: Dependency Inversion — Service depende de IUsuarioRepository (domain),
 * esta clase en infrastructure implementa la conexión con Spring Data JPA
 */
@Repository
public class UsuarioRepositoryAdapter implements IUsuarioRepository {

    private final JpaUsuarioRepository jpa;

    public UsuarioRepositoryAdapter(JpaUsuarioRepository jpa) { this.jpa = jpa; }

    @Override public Optional<Usuario> findByUsername(String username) { return jpa.findByUsername(username); }
    @Override public Optional<Usuario> findByEmail(String email) { return jpa.findByEmail(email); }
    @Override public Optional<Usuario> findById(Long id) { return jpa.findById(id); }
    @Override public boolean existsByUsername(String username) { return jpa.existsByUsername(username); }
    @Override public boolean existsByEmail(String email) { return jpa.existsByEmail(email); }
    @Override public List<Usuario> findAllActive() { return jpa.findAllActive(); }
    @Override public List<Usuario> findAll() { return jpa.findAll(org.springframework.data.domain.Sort.by("apellidos", "nombres")); }
    @Override public Usuario save(Usuario usuario) { return jpa.save(usuario); }
}
