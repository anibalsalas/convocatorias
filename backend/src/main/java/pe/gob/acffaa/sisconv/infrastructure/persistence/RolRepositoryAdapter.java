package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Rol;
import pe.gob.acffaa.sisconv.domain.repository.IRolRepository;
import java.util.Optional;
import java.util.List;

@Repository
public class RolRepositoryAdapter implements IRolRepository {
    private final JpaRolRepository jpa;
    public RolRepositoryAdapter(JpaRolRepository jpa) { this.jpa = jpa; }

    @Override public Optional<Rol> findByCodigoRol(String codigoRol) { return jpa.findByCodigoRol(codigoRol); }
    @Override public List<Rol> findByEstado(String estado) { return jpa.findByEstado(estado); }
}
