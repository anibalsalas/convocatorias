package pe.gob.acffaa.sisconv.infrastructure.persistence;

import jakarta.transaction.Transactional;
import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.FactorEvaluacion;
import pe.gob.acffaa.sisconv.domain.repository.IFactorEvaluacionRepository;
import java.util.List;
import java.util.Optional;

@Repository
public class FactorEvaluacionRepositoryAdapter implements IFactorEvaluacionRepository {
    private final JpaFactorEvaluacionRepository jpa;
    public FactorEvaluacionRepositoryAdapter(JpaFactorEvaluacionRepository jpa) { this.jpa = jpa; }

    @Override public FactorEvaluacion save(FactorEvaluacion f) { return jpa.save(f); }
    @Override public List<FactorEvaluacion> saveAll(List<FactorEvaluacion> list) { return jpa.saveAll(list); }
    @Override public List<FactorEvaluacion> findByConvocatoriaId(Long id) { return jpa.findByConvocatoriaIdConvocatoriaOrderByOrden(id); }
    @Override public List<FactorEvaluacion> findByConvocatoriaIdSoloFases(Long id) { return jpa.findByConvocatoriaIdConvocatoriaAndFactorPadreIsNullOrderByOrden(id); }
    @Override public List<FactorEvaluacion> findByFactorPadreId(Long idFactorPadre) { return jpa.findByFactorPadreIdFactorOrderByOrden(idFactorPadre); }
    @Override public Optional<FactorEvaluacion> findById(Long id) { return jpa.findById(id); }
    @Override @Transactional public void deleteByConvocatoriaId(Long id) { jpa.deleteByConvocatoriaIdConvocatoria(id); }
    @Override @Transactional public void deleteById(Long id) { jpa.deleteById(id); }
}
