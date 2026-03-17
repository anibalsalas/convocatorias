package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.NivelPuesto;
import pe.gob.acffaa.sisconv.domain.repository.INivelPuestoRepository;

import java.util.List;

/**
 * Adapter: conecta INivelPuestoRepository (domain) con Spring Data JPA.
 */
@Repository
public class NivelPuestoRepositoryAdapter implements INivelPuestoRepository {

    private final JpaNivelPuestoRepository jpa;

    public NivelPuestoRepositoryAdapter(JpaNivelPuestoRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public List<NivelPuesto> findAllOrderByOrden() {
        return jpa.findAllOrderByOrden();
    }
}
