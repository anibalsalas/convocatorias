package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Notificacion;
import pe.gob.acffaa.sisconv.domain.repository.INotificacionRepository;

@Repository
public class NotificacionRepositoryAdapter implements INotificacionRepository {
    private final JpaNotificacionRepository jpa;
    public NotificacionRepositoryAdapter(JpaNotificacionRepository j) { this.jpa = j; }

    @Override public Notificacion save(Notificacion n) { return jpa.save(n); }
    @Override public Page<Notificacion> findByUsuarioId(Long iu, Pageable p) { return jpa.findByUsuarioDestinoIdUsuario(iu, p); }
    @Override public Page<Notificacion> findByUsuarioIdAndEstado(Long iu, String e, Pageable p) { return jpa.findByUsuarioDestinoIdUsuarioAndEstado(iu, e, p); }
}
