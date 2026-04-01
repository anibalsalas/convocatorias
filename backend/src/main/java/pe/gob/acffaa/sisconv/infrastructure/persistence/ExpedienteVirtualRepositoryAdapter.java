package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.ExpedienteVirtual;
import pe.gob.acffaa.sisconv.domain.repository.IExpedienteVirtualRepository;

import java.util.List;
import java.util.Optional;

@Repository
public class ExpedienteVirtualRepositoryAdapter implements IExpedienteVirtualRepository {
    private final JpaExpedienteVirtualRepository jpa;

    public ExpedienteVirtualRepositoryAdapter(JpaExpedienteVirtualRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public ExpedienteVirtual save(ExpedienteVirtual e) {
        return jpa.save(e);
    }

    @Override
    public Optional<ExpedienteVirtual> findById(Long id) {
        return jpa.findById(id);
    }

    @Override
    public List<ExpedienteVirtual> findByPostulacionId(Long idPostulacion) {
        return jpa.findByPostulacionIdPostulacion(idPostulacion);
    }

    @Override
    public long countByPostulacionId(Long idPostulacion) {
        return jpa.countByPostulacionIdPostulacion(idPostulacion);
    }

    @Override
    public void deleteById(Long id) {
        jpa.deleteById(id);
    }
}