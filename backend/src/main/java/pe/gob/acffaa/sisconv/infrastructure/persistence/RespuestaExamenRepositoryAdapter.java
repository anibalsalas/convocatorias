package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.RespuestaExamen;
import pe.gob.acffaa.sisconv.domain.repository.IRespuestaExamenRepository;
import java.util.List;

@Repository
public class RespuestaExamenRepositoryAdapter implements IRespuestaExamenRepository {
    private final JpaRespuestaExamenRepository jpa;
    public RespuestaExamenRepositoryAdapter(JpaRespuestaExamenRepository j) { this.jpa = j; }

    @Override public RespuestaExamen save(RespuestaExamen r) { return jpa.save(r); }
    @Override public List<RespuestaExamen> saveAll(List<RespuestaExamen> list) { return jpa.saveAll(list); }
    @Override public List<RespuestaExamen> findByExamenPostulanteId(Long id) { return jpa.findByExamenPostulanteIdExamenPostulante(id); }
}
