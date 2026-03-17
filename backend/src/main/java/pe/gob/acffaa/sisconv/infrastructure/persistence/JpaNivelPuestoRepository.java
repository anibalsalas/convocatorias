package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.gob.acffaa.sisconv.domain.model.NivelPuesto;

import java.util.List;

/**
 * Spring Data JPA Repository para TBL_NIVEL_PUESTO.
 */
public interface JpaNivelPuestoRepository extends JpaRepository<NivelPuesto, Long> {

    @Query("SELECT np FROM NivelPuesto np ORDER BY np.orden ASC, np.idNivelPuesto ASC")
    List<NivelPuesto> findAllOrderByOrden();
}
