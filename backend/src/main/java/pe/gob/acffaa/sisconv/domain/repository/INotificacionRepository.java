package pe.gob.acffaa.sisconv.domain.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import pe.gob.acffaa.sisconv.domain.model.Notificacion;
import java.util.List;
import java.util.Optional;

/**
 * Puerto de dominio Notificacion — E44 bandeja paginada.
 * SAD §3.2: Domain layer. Pageable permitido en puerto (convención del proyecto).
 */
public interface INotificacionRepository {
    Notificacion save(Notificacion n);
    Optional<Notificacion> findById(Long id);
    Page<Notificacion> findByUsuarioId(Long idUsuario, Pageable pageable);
    Page<Notificacion> findByUsuarioIdAndEstado(Long idUsuario, String estado, Pageable pageable);
    /** E31 — lectura de notificaciones encoladas (PENDIENTE) para envío asíncrono. */
    List<Notificacion> findByConvocatoriaIdAndEstado(Long idConvocatoria, String estado);
}
