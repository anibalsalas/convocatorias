package pe.gob.acffaa.sisconv.domain.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import pe.gob.acffaa.sisconv.domain.model.Notificacion;

/**
 * Puerto de dominio Notificacion — E44 bandeja paginada.
 * SAD §3.2: Domain layer. Pageable permitido en puerto (convención del proyecto).
 */
public interface INotificacionRepository {
    Notificacion save(Notificacion n);
    Page<Notificacion> findByUsuarioId(Long idUsuario, Pageable pageable);
    Page<Notificacion> findByUsuarioIdAndEstado(Long idUsuario, String estado, Pageable pageable);
}
