package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.MiembroComite;
import pe.gob.acffaa.sisconv.domain.repository.IMiembroComiteRepository;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Adapter: conecta IMiembroComiteRepository (domain) con Spring Data JPA.
 * SAD §3.3 SOLID-D: Dependency Inversion.
 */
@Repository
public class MiembroComiteRepositoryAdapter implements IMiembroComiteRepository {

    private final JpaMiembroComiteRepository jpa;

    public MiembroComiteRepositoryAdapter(JpaMiembroComiteRepository jpa) {
        this.jpa = jpa;
    }

    @Override public MiembroComite save(MiembroComite miembro) { return jpa.save(miembro); }
    @Override public Optional<MiembroComite> findById(Long id) { return jpa.findById(id); }
    @Override public void delete(MiembroComite miembro) { jpa.delete(miembro); }
    @Override public void actualizarFechaNotificacion(Long id, LocalDateTime fecha) { jpa.actualizarFechaNotificacion(id, fecha); }
}
