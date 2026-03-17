package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Acta;
import pe.gob.acffaa.sisconv.domain.repository.IActaRepository;
import java.util.Optional;

@Repository
public class ActaRepositoryAdapter implements IActaRepository {
    private final JpaActaRepository jpa;
    public ActaRepositoryAdapter(JpaActaRepository jpa) { this.jpa = jpa; }

    @Override public Acta save(Acta a) { return jpa.save(a); }
    @Override public Optional<Acta> findById(Long id) { return jpa.findById(id); }
    @Override public Optional<Acta> findByConvocatoriaIdAndTipoActa(Long id, String tipo) { return jpa.findByConvocatoriaIdConvocatoriaAndTipoActa(id, tipo); }
}
