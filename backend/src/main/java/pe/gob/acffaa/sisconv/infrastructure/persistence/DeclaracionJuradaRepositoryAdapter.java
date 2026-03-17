package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.DeclaracionJurada;
import pe.gob.acffaa.sisconv.domain.repository.IDeclaracionJuradaRepository;
import java.util.*;

@Repository
public class DeclaracionJuradaRepositoryAdapter implements IDeclaracionJuradaRepository {
    private final JpaDeclaracionJuradaRepository jpa;
    public DeclaracionJuradaRepositoryAdapter(JpaDeclaracionJuradaRepository j){this.jpa=j;}
    @Override public DeclaracionJurada save(DeclaracionJurada d){return jpa.save(d);}
    @Override public List<DeclaracionJurada> findByPostulacionId(Long id){return jpa.findByPostulacionIdPostulacion(id);}
}
