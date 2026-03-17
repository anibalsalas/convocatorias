package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.ComiteSeleccion;
import java.util.Optional;

public interface IComiteSeleccionRepository {
    ComiteSeleccion save(ComiteSeleccion comite);
    Optional<ComiteSeleccion> findById(Long id);
    Optional<ComiteSeleccion> findByConvocatoriaId(Long idConvocatoria);
    boolean existsByConvocatoriaId(Long idConvocatoria);
}
