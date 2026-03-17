package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.ComiteSeleccion;
import pe.gob.acffaa.sisconv.domain.repository.IComiteSeleccionRepository;
import java.util.Optional;

@Repository
public class ComiteSeleccionRepositoryAdapter implements IComiteSeleccionRepository {
    private final JpaComiteSeleccionRepository jpa;
    public ComiteSeleccionRepositoryAdapter(JpaComiteSeleccionRepository jpa) { this.jpa = jpa; }

    @Override public ComiteSeleccion save(ComiteSeleccion c) { return jpa.save(c); }
    @Override public Optional<ComiteSeleccion> findById(Long id) { return jpa.findById(id); }
    @Override public Optional<ComiteSeleccion> findByConvocatoriaId(Long id) { return jpa.findByConvocatoriaIdConvocatoria(id); }
    @Override public boolean existsByConvocatoriaId(Long id) { return jpa.existsByConvocatoriaIdConvocatoria(id); }
}
