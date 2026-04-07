package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.ExamenPostulante;
import pe.gob.acffaa.sisconv.domain.repository.IExamenPostulanteRepository;
import java.util.List;
import java.util.Optional;

@Repository
public class ExamenPostulanteRepositoryAdapter implements IExamenPostulanteRepository {
    private final JpaExamenPostulanteRepository jpa;
    public ExamenPostulanteRepositoryAdapter(JpaExamenPostulanteRepository j) { this.jpa = j; }

    @Override public ExamenPostulante save(ExamenPostulante e) { return jpa.save(e); }
    @Override public Optional<ExamenPostulante> findById(Long id) { return jpa.findById(id); }
    @Override public Optional<ExamenPostulante> findByConfigExamenIdAndPostulacionId(Long idConfig, Long idPost) {
        return jpa.findByConfigExamenIdConfigExamenAndPostulacionIdPostulacion(idConfig, idPost);
    }
    @Override public List<ExamenPostulante> findByConfigExamenId(Long idConfig) { return jpa.findByConfigExamenIdConfigExamen(idConfig); }
    @Override public List<ExamenPostulante> findByConfigExamenIdWithPostulacion(Long idConfig) {
        return jpa.findByConfigExamenIdWithPostulacion(idConfig);
    }
    @Override public List<ExamenPostulante> findByEstado(String estado) { return jpa.findByEstado(estado); }
}
