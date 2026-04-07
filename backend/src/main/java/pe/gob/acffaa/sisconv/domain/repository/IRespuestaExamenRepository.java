package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.RespuestaExamen;
import java.util.List;

public interface IRespuestaExamenRepository {
    RespuestaExamen save(RespuestaExamen r);
    List<RespuestaExamen> saveAll(List<RespuestaExamen> respuestas);
    List<RespuestaExamen> findByExamenPostulanteId(Long idExamen);
}
