package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.DenominacionPuesto;
import pe.gob.acffaa.sisconv.domain.repository.IDenominacionPuestoRepository;

import java.util.List;

/**
 * Adapter: conecta IDenominacionPuestoRepository (domain) con Spring Data JPA.
 */
@Repository
public class DenominacionPuestoRepositoryAdapter implements IDenominacionPuestoRepository {

    private final JpaDenominacionPuestoRepository jpa;

    public DenominacionPuestoRepositoryAdapter(JpaDenominacionPuestoRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public List<DenominacionPuesto> findAllOrderByOrden() {
        return jpa.findAllOrderByOrden();
    }
}
