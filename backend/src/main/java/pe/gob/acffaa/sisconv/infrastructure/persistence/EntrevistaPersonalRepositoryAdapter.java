package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.EntrevistaPersonal;
import pe.gob.acffaa.sisconv.domain.repository.IEntrevistaPersonalRepository;
import java.util.*;

@Repository
public class EntrevistaPersonalRepositoryAdapter implements IEntrevistaPersonalRepository {
    private final JpaEntrevistaPersonalRepository jpa;
    public EntrevistaPersonalRepositoryAdapter(JpaEntrevistaPersonalRepository j){this.jpa=j;}
    @Override public EntrevistaPersonal save(EntrevistaPersonal e){return jpa.save(e);}
    @Override public Optional<EntrevistaPersonal> findByPostulacionId(Long id){return jpa.findByPostulacionIdPostulacion(id);}
}
