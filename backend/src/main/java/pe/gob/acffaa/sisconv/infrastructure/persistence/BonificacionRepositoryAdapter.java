package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Bonificacion;
import pe.gob.acffaa.sisconv.domain.repository.IBonificacionRepository;
import java.util.*;

@Repository
public class BonificacionRepositoryAdapter implements IBonificacionRepository {
    private final JpaBonificacionRepository jpa;
    public BonificacionRepositoryAdapter(JpaBonificacionRepository j){this.jpa=j;}
    @Override public Bonificacion save(Bonificacion b){return jpa.save(b);}
    @Override public List<Bonificacion> saveAll(List<Bonificacion> l){return jpa.saveAll(l);}
    @Override public List<Bonificacion> findByPostulacionId(Long id){return jpa.findByPostulacionIdPostulacion(id);}
}
