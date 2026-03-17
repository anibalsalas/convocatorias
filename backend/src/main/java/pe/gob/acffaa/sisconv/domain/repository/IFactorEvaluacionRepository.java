package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.FactorEvaluacion;
import java.util.List;
import java.util.Optional;

public interface IFactorEvaluacionRepository {
    FactorEvaluacion save(FactorEvaluacion factor);
    List<FactorEvaluacion> saveAll(List<FactorEvaluacion> factores);
    List<FactorEvaluacion> findByConvocatoriaId(Long idConvocatoria);
    List<FactorEvaluacion> findByConvocatoriaIdSoloFases(Long idConvocatoria);
    List<FactorEvaluacion> findByFactorPadreId(Long idFactorPadre);
    Optional<FactorEvaluacion> findById(Long idFactor);
    void deleteByConvocatoriaId(Long idConvocatoria);
    void deleteById(Long idFactor);
}
