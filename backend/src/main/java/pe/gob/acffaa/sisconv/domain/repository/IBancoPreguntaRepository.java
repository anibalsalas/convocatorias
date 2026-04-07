package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.BancoPregunta;
import java.util.List;

public interface IBancoPreguntaRepository {
    BancoPregunta save(BancoPregunta p);
    List<BancoPregunta> saveAll(List<BancoPregunta> preguntas);
    List<BancoPregunta> findByConvocatoriaId(Long idConv);
    long countByConvocatoriaId(Long idConv);
    void deleteByConvocatoriaId(Long idConv);
}
