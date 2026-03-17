package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Tacha;
import pe.gob.acffaa.sisconv.domain.repository.ITachaRepository;
import java.util.*;

@Repository
public class TachaRepositoryAdapter implements ITachaRepository {
    private final JpaTachaRepository jpa;
    public TachaRepositoryAdapter(JpaTachaRepository j){this.jpa=j;}
    @Override public Tacha save(Tacha t){return jpa.save(t);}
    @Override public Optional<Tacha> findById(Long id){return jpa.findById(id);}
    @Override public List<Tacha> findByConvocatoriaId(Long c){return jpa.findByConvocatoriaIdConvocatoria(c);}
    @Override public List<Tacha> findByPostulacionId(Long id){return jpa.findByPostulacionIdPostulacion(id);}
}
