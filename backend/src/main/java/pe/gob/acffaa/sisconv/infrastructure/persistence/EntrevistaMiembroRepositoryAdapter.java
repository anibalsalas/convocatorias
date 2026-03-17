package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.EntrevistaMiembro;
import pe.gob.acffaa.sisconv.domain.repository.IEntrevistaMiembroRepository;
import java.util.*;

@Repository
public class EntrevistaMiembroRepositoryAdapter implements IEntrevistaMiembroRepository {
    private final JpaEntrevistaMiembroRepository jpa;
    public EntrevistaMiembroRepositoryAdapter(JpaEntrevistaMiembroRepository j){this.jpa=j;}
    @Override public EntrevistaMiembro save(EntrevistaMiembro e){return jpa.save(e);}
    @Override public List<EntrevistaMiembro> saveAll(List<EntrevistaMiembro> l){return jpa.saveAll(l);}
    @Override public List<EntrevistaMiembro> findByEntrevistaId(Long id){return jpa.findByEntrevistaIdEntrevista(id);}
}
