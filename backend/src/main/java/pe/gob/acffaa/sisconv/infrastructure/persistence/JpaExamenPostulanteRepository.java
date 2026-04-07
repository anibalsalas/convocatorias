package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.model.ExamenPostulante;
import java.util.List;
import java.util.Optional;

public interface JpaExamenPostulanteRepository extends JpaRepository<ExamenPostulante, Long> {
    Optional<ExamenPostulante> findByConfigExamenIdConfigExamenAndPostulacionIdPostulacion(Long idConfig, Long idPost);
    List<ExamenPostulante> findByConfigExamenIdConfigExamen(Long idConfig);
    List<ExamenPostulante> findByEstado(String estado);

    @Query("SELECT DISTINCT e FROM ExamenPostulante e "
            + "JOIN FETCH e.postulacion p "
            + "LEFT JOIN FETCH p.postulante "
            + "WHERE e.configExamen.idConfigExamen = :idConfig")
    List<ExamenPostulante> findByConfigExamenIdWithPostulacion(@Param("idConfig") Long idConfig);
}
