package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Notificacion;
import pe.gob.acffaa.sisconv.domain.repository.INotificacionRepository;
import java.util.List;
import java.util.Optional;

@Repository
public class NotificacionRepositoryAdapter implements INotificacionRepository {
    private final JpaNotificacionRepository jpa;
    public NotificacionRepositoryAdapter(JpaNotificacionRepository j) { this.jpa = j; }

    @Override public Notificacion save(Notificacion n) { return jpa.save(n); }
    @Override public Optional<Notificacion> findById(Long id) { return jpa.findById(id); }
    @Override public Page<Notificacion> findByUsuarioId(Long iu, Pageable p) { return jpa.findByUsuarioDestinoIdUsuario(iu, p); }
    @Override public Page<Notificacion> findByUsuarioIdAndEstado(Long iu, String e, Pageable p) { return jpa.findByUsuarioDestinoIdUsuarioAndEstado(iu, e, p); }
    @Override public List<Notificacion> findByConvocatoriaIdAndEstado(Long idConvocatoria, String estado) { return jpa.findByConvocatoria_IdConvocatoriaAndEstado(idConvocatoria, estado); }
    @Override public List<Notificacion> findEnviadasByConvocatoriaYRol(Long idConvocatoria, String codigoRol) { return jpa.findEnviadasByConvocatoriaYRol(idConvocatoria, codigoRol); }
}
