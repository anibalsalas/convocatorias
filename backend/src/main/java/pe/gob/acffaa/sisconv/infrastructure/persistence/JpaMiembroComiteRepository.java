package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.model.MiembroComite;

import java.time.LocalDateTime;

public interface JpaMiembroComiteRepository extends JpaRepository<MiembroComite, Long> {

    /** Actualiza solo FEC_ULT_NOTIFICACION — evita SELECT + UPDATE completo. */
    @Modifying
    @Query("UPDATE MiembroComite m SET m.fechaUltNotificacion = :fecha WHERE m.idMiembroComite = :id")
    void actualizarFechaNotificacion(@Param("id") Long id, @Param("fecha") LocalDateTime fecha);
}
