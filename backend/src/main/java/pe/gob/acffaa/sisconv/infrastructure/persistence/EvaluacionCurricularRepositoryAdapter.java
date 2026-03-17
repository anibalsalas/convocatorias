package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.EvaluacionCurricular;
import pe.gob.acffaa.sisconv.domain.repository.IEvaluacionCurricularRepository;
import java.util.*;

@Repository
public class EvaluacionCurricularRepositoryAdapter implements IEvaluacionCurricularRepository {
    private final JpaEvaluacionCurricularRepository jpa;
    public EvaluacionCurricularRepositoryAdapter(JpaEvaluacionCurricularRepository j){this.jpa=j;}
    @Override public EvaluacionCurricular save(EvaluacionCurricular e){return jpa.save(e);}
    @Override public List<EvaluacionCurricular> saveAll(List<EvaluacionCurricular> l){return jpa.saveAll(l);}
    @Override public List<EvaluacionCurricular> findByPostulacionId(Long id){return jpa.findByPostulacionIdPostulacion(id);}
}
