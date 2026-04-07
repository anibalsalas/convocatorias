package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.BancoPregunta;
import pe.gob.acffaa.sisconv.domain.repository.IBancoPreguntaRepository;
import java.util.List;

@Repository
public class BancoPreguntaRepositoryAdapter implements IBancoPreguntaRepository {
    private final JpaBancoPreguntaRepository jpa;
    public BancoPreguntaRepositoryAdapter(JpaBancoPreguntaRepository j) { this.jpa = j; }

    @Override public BancoPregunta save(BancoPregunta p) { return jpa.save(p); }
    @Override public List<BancoPregunta> saveAll(List<BancoPregunta> list) { return jpa.saveAll(list); }
    @Override public List<BancoPregunta> findByConvocatoriaId(Long id) { return jpa.findByConvocatoriaIdConvocatoriaOrderByNumeroPregunta(id); }
    @Override public long countByConvocatoriaId(Long id) { return jpa.countByConvocatoriaIdConvocatoria(id); }
    @Override public void deleteByConvocatoriaId(Long id) { jpa.deleteByConvocatoriaIdConvocatoria(id); }
}
