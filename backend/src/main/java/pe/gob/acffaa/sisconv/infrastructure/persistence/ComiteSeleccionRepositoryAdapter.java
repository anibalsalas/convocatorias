package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.ComiteSeleccion;
import pe.gob.acffaa.sisconv.domain.repository.IComiteSeleccionRepository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class ComiteSeleccionRepositoryAdapter implements IComiteSeleccionRepository {
    private final JpaComiteSeleccionRepository jpa;
    public ComiteSeleccionRepositoryAdapter(JpaComiteSeleccionRepository jpa) { this.jpa = jpa; }

    @Override public ComiteSeleccion save(ComiteSeleccion c) { return jpa.save(c); }
    @Override public Optional<ComiteSeleccion> findById(Long id) { return jpa.findById(id); }
    @Override public Optional<ComiteSeleccion> findByConvocatoriaId(Long id) { return jpa.findByConvocatoriaIdConvocatoria(id); }
    @Override public boolean existsByConvocatoriaId(Long id) { return jpa.existsByConvocatoriaIdConvocatoria(id); }

    @Override
    public Map<Long, String> mapEstadoByConvocatoriaIds(Collection<Long> idsConvocatoria) {
        if (idsConvocatoria == null || idsConvocatoria.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = new ArrayList<>(idsConvocatoria);
        List<Object[]> rows = jpa.findEstadoByConvocatoriaIdIn(ids);
        Map<Long, String> out = new HashMap<>();
        for (Object[] row : rows) {
            out.put((Long) row[0], (String) row[1]);
        }
        return out;
    }
}
