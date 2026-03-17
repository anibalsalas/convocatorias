package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.EvaluacionTecnica;
import java.util.List;

public interface IEvaluacionTecnicaRepository {
    EvaluacionTecnica save(EvaluacionTecnica e);
    List<EvaluacionTecnica> findByPostulacionId(Long id);
}
