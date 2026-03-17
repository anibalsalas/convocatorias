package pe.gob.acffaa.sisconv.infrastructure.persistence;

import jakarta.transaction.Transactional;
import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Cronograma;
import pe.gob.acffaa.sisconv.domain.repository.ICronogramaRepository;
import java.util.List;

@Repository
public class CronogramaRepositoryAdapter implements ICronogramaRepository {
    private final JpaCronogramaRepository jpa;
    public CronogramaRepositoryAdapter(JpaCronogramaRepository jpa) { this.jpa = jpa; }

    @Override public Cronograma save(Cronograma c) { return jpa.save(c); }
    @Override public List<Cronograma> saveAll(List<Cronograma> list) { return jpa.saveAll(list); }
    @Override public List<Cronograma> findByConvocatoriaId(Long id) { return jpa.findByConvocatoriaIdConvocatoriaOrderByOrden(id); }
    @Override @Transactional public void deleteByConvocatoriaId(Long id) { jpa.deleteByConvocatoriaIdConvocatoria(id); }
}
