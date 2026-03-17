package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.CuadroMeritos;
import pe.gob.acffaa.sisconv.domain.repository.ICuadroMeritosRepository;
import java.util.*;

@Repository
public class CuadroMeritosRepositoryAdapter implements ICuadroMeritosRepository {
    private final JpaCuadroMeritosRepository jpa;
    public CuadroMeritosRepositoryAdapter(JpaCuadroMeritosRepository j){this.jpa=j;}
    @Override public CuadroMeritos save(CuadroMeritos c){return jpa.save(c);}
    @Override public List<CuadroMeritos> saveAll(List<CuadroMeritos> l){return jpa.saveAll(l);}
    @Override public List<CuadroMeritos> findByConvocatoriaId(Long c){return jpa.findByConvocatoriaIdConvocatoria(c);}
    @Override public Optional<CuadroMeritos> findByPostulacionId(Long id){return jpa.findByPostulacionIdPostulacion(id);}
}
