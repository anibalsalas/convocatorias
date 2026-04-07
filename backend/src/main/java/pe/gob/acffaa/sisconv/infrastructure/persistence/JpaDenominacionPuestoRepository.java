package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.gob.acffaa.sisconv.domain.model.DenominacionPuesto;

import java.util.List;

/**
 * Spring Data JPA Repository para TBL_DENOMINACION_PUESTO.
 */
public interface JpaDenominacionPuestoRepository extends JpaRepository<DenominacionPuesto, Long> {

    @Query("SELECT d FROM DenominacionPuesto d ORDER BY d.orden ASC, d.idDenominacionPuesto ASC")
    List<DenominacionPuesto> findAllOrderByOrden();
}
