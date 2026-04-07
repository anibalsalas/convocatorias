package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.model.ComiteSeleccion;

import java.util.List;
import java.util.Optional;

public interface JpaComiteSeleccionRepository extends JpaRepository<ComiteSeleccion, Long> {
    Optional<ComiteSeleccion> findByConvocatoriaIdConvocatoria(Long idConvocatoria);
    boolean existsByConvocatoriaIdConvocatoria(Long idConvocatoria);

    @Query("SELECT cs.convocatoria.idConvocatoria, cs.estado FROM ComiteSeleccion cs "
            + "WHERE cs.convocatoria.idConvocatoria IN :ids")
    List<Object[]> findEstadoByConvocatoriaIdIn(@Param("ids") List<Long> ids);
}
