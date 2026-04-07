package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.RespuestaExamen;
import java.util.List;

public interface JpaRespuestaExamenRepository extends JpaRepository<RespuestaExamen, Long> {
    List<RespuestaExamen> findByExamenPostulanteIdExamenPostulante(Long idExamen);
}
