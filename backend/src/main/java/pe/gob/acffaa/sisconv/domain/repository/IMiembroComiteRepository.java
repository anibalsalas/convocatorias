package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.MiembroComite;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Puerto de salida para persistencia de MiembroComite — SAD §3.3 SOLID-D.
 * Implementado por MiembroComiteRepositoryAdapter en infrastructure.
 */
public interface IMiembroComiteRepository {

    MiembroComite save(MiembroComite miembro);

    Optional<MiembroComite> findById(Long id);

    void delete(MiembroComite miembro);

    void actualizarFechaNotificacion(Long id, LocalDateTime fecha);
}
