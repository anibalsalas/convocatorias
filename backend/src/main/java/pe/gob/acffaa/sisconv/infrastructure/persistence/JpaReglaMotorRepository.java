package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.model.ReglaMotor;

import java.util.List;

/**
 * Spring Data JPA Repository para TBL_REGLA_MOTOR.
 * SAD §3.3: Infrastructure layer — acceso a datos.
 */
public interface JpaReglaMotorRepository extends JpaRepository<ReglaMotor, Long> {

    @Query("SELECT r FROM ReglaMotor r WHERE r.requerimiento.idRequerimiento = :idReq ORDER BY r.prioridad")
    List<ReglaMotor> findByIdRequerimiento(@Param("idReq") Long idRequerimiento);

    @Modifying
    @Query("DELETE FROM ReglaMotor r WHERE r.requerimiento.idRequerimiento = :idReq")
    void deleteByIdRequerimiento(@Param("idReq") Long idRequerimiento);
}
