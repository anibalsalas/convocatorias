package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.EvaluacionCurricular;
import java.util.List;

public interface IEvaluacionCurricularRepository {
    EvaluacionCurricular save(EvaluacionCurricular e);
    List<EvaluacionCurricular> saveAll(List<EvaluacionCurricular> list);
    List<EvaluacionCurricular> findByPostulacionId(Long id);
}
