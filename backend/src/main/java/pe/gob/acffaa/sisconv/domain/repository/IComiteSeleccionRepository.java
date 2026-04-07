package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.ComiteSeleccion;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

public interface IComiteSeleccionRepository {
    ComiteSeleccion save(ComiteSeleccion comite);
    Optional<ComiteSeleccion> findById(Long id);
    Optional<ComiteSeleccion> findByConvocatoriaId(Long idConvocatoria);
    boolean existsByConvocatoriaId(Long idConvocatoria);

    /** Estado del comité por id convocatoria; una query IN para el listado paginado. */
    Map<Long, String> mapEstadoByConvocatoriaIds(Collection<Long> idsConvocatoria);
}
