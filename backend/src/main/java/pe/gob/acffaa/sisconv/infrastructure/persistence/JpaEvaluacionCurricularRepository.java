package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.EvaluacionCurricular;
import java.util.List;
public interface JpaEvaluacionCurricularRepository extends JpaRepository<EvaluacionCurricular,Long>{
    List<EvaluacionCurricular> findByPostulacionIdPostulacion(Long id);
}
