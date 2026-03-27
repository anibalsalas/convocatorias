package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.model.EvaluacionCurricular;
import java.util.List;

public interface JpaEvaluacionCurricularRepository extends JpaRepository<EvaluacionCurricular, Long> {
    List<EvaluacionCurricular> findByPostulacionIdPostulacion(Long id);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM EvaluacionCurricular e WHERE e.postulacion.idPostulacion = :id")
    void deleteByPostulacionIdPostulacion(@Param("id") Long id);
}
