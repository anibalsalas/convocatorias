package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.EvaluacionTecnica;
import java.util.List;
public interface JpaEvaluacionTecnicaRepository extends JpaRepository<EvaluacionTecnica,Long>{
    List<EvaluacionTecnica> findByPostulacionIdPostulacion(Long id);
}
