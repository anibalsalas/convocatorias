package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Requerimiento;
import pe.gob.acffaa.sisconv.domain.repository.IRequerimientoRepository;
import java.util.Optional;

/**
 * Adapter: conecta IRequerimientoRepository (domain) con Spring Data JPA.
 * SAD §3.3 SOLID-D: Dependency Inversion.
 */
@Repository
public class RequerimientoRepositoryAdapter implements IRequerimientoRepository {

    private final JpaRequerimientoRepository jpa;

    public RequerimientoRepositoryAdapter(JpaRequerimientoRepository jpa) {
        this.jpa = jpa;
    }

    @Override public Requerimiento save(Requerimiento requerimiento) { return jpa.save(requerimiento); }
    @Override public Optional<Requerimiento> findById(Long id) { return jpa.findById(id); }
    
    @Override
    public Optional<Requerimiento> findByIdWithProfileAndCondition(Long id) {
        return jpa.findByIdWithProfileAndCondition(id);
    }
    
    
    @Override public Page<Requerimiento> findAll(Pageable pageable) { return jpa.findAll(pageable); }
    @Override public Page<Requerimiento> findByEstado(String estado, Pageable pageable) { return jpa.findByEstado(estado, pageable); }
    @Override public Page<Requerimiento> findByIdAreaSolicitante(Long idArea, Pageable pageable) { return jpa.findByIdAreaSolicitante(idArea, pageable); }
    @Override public boolean existsByNumeroRequerimiento(String numero) { return jpa.existsByNumeroRequerimiento(numero); }
    @Override public long countByAnio(int anio) { return jpa.countByAnio(anio); }
    @Override public long countElaboradosPendientesVerificacionPresupuestal() { return jpa.countElaboradosPendientesVerificacionPresupuestal(); }
    @Override public long countByEstado(String estado) { return jpa.countByEstado(estado); }
    @Override public long countConfiguradosSinConvocatoria() { return jpa.countConfiguradosSinConvocatoria(); }
}
