package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.Notificacion;

public interface JpaNotificacionRepository extends JpaRepository<Notificacion, Long> {
    Page<Notificacion> findByUsuarioDestinoIdUsuario(Long idUsuario, Pageable pageable);
    Page<Notificacion> findByUsuarioDestinoIdUsuarioAndEstado(Long idUsuario, String estado, Pageable pageable);
}
