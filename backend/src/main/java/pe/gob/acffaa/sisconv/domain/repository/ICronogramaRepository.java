package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.Cronograma;
import java.util.List;

public interface ICronogramaRepository {
    Cronograma save(Cronograma cronograma);
    List<Cronograma> saveAll(List<Cronograma> cronogramas);
    List<Cronograma> findByConvocatoriaId(Long idConvocatoria);
    List<Cronograma> findByConvocatoriaIdIn(List<Long> ids);
    void deleteByConvocatoriaId(Long idConvocatoria);
}
