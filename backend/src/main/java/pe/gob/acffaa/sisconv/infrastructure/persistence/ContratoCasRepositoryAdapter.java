package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.ContratoCas;
import pe.gob.acffaa.sisconv.domain.repository.IContratoCasRepository;
import java.util.List;
import java.util.Optional;

@Repository
public class ContratoCasRepositoryAdapter implements IContratoCasRepository {
    private final JpaContratoCasRepository jpa;
    public ContratoCasRepositoryAdapter(JpaContratoCasRepository j) { this.jpa = j; }

    @Override public ContratoCas save(ContratoCas c) { return jpa.save(c); }
    @Override public Optional<ContratoCas> findById(Long id) { return jpa.findById(id); }
    @Override public List<ContratoCas> findByConvocatoriaId(Long ic) { return jpa.findByConvocatoriaIdConvocatoria(ic); }
    @Override public Optional<ContratoCas> findByConvocatoriaIdAndProcesoEstado(Long ic, String pe) { return jpa.findByConvocatoriaIdConvocatoriaAndProcesoEstado(ic, pe); }
    @Override public Optional<ContratoCas> findByPostulacionId(Long ip) { return jpa.findByPostulacionIdPostulacion(ip); }
    @Override public boolean existsByConvocatoriaIdAndEstadoNot(Long ic, String e) { return jpa.existsByConvocatoriaIdConvocatoriaAndEstadoNot(ic, e); }
}
