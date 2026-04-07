package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.ExamenPostulante;
import java.util.List;
import java.util.Optional;

public interface IExamenPostulanteRepository {
    ExamenPostulante save(ExamenPostulante e);
    Optional<ExamenPostulante> findById(Long id);
    Optional<ExamenPostulante> findByConfigExamenIdAndPostulacionId(Long idConfig, Long idPostulacion);
    List<ExamenPostulante> findByConfigExamenId(Long idConfig);

    /** Examen + postulación + postulante cargados (evita N+1 en consolidados ORH). */
    List<ExamenPostulante> findByConfigExamenIdWithPostulacion(Long idConfig);

    List<ExamenPostulante> findByEstado(String estado);
}
