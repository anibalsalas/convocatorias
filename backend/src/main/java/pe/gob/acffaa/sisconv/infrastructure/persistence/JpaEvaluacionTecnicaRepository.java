package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.model.EvaluacionTecnica;
import java.util.List;
public interface JpaEvaluacionTecnicaRepository extends JpaRepository<EvaluacionTecnica,Long>{
    List<EvaluacionTecnica> findByPostulacionIdPostulacion(Long id);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM EvaluacionTecnica e WHERE e.postulacion.idPostulacion = :id")
    void deleteByPostulacionIdPostulacion(@Param("id") Long id);
}
