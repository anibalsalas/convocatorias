package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.EvaluacionTecnica;
import pe.gob.acffaa.sisconv.domain.repository.IEvaluacionTecnicaRepository;
import java.util.*;

@Repository
public class EvaluacionTecnicaRepositoryAdapter implements IEvaluacionTecnicaRepository {
    private final JpaEvaluacionTecnicaRepository jpa;
    public EvaluacionTecnicaRepositoryAdapter(JpaEvaluacionTecnicaRepository j){this.jpa=j;}
    @Override public EvaluacionTecnica save(EvaluacionTecnica e){return jpa.save(e);}
    @Override public List<EvaluacionTecnica> findByPostulacionId(Long id){return jpa.findByPostulacionIdPostulacion(id);}
}
