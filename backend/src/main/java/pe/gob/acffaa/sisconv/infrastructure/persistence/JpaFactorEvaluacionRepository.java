package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.FactorEvaluacion;
import java.util.List;

public interface JpaFactorEvaluacionRepository extends JpaRepository<FactorEvaluacion, Long> {
    List<FactorEvaluacion> findByConvocatoriaIdConvocatoriaOrderByOrden(Long idConvocatoria);
    List<FactorEvaluacion> findByConvocatoriaIdConvocatoriaAndFactorPadreIsNullOrderByOrden(Long idConvocatoria);
    List<FactorEvaluacion> findByFactorPadreIdFactorOrderByOrden(Long idFactorPadre);
    void deleteByConvocatoriaIdConvocatoria(Long idConvocatoria);
}
