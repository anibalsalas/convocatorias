package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.ComiteSeleccion;
import java.util.Optional;

public interface JpaComiteSeleccionRepository extends JpaRepository<ComiteSeleccion, Long> {
    Optional<ComiteSeleccion> findByConvocatoriaIdConvocatoria(Long idConvocatoria);
    boolean existsByConvocatoriaIdConvocatoria(Long idConvocatoria);
}
