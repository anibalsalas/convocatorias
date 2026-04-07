package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.PerfilPuesto;
import pe.gob.acffaa.sisconv.domain.repository.IPerfilPuestoRepository;

import java.util.Optional;
import java.util.Set;

/**
 * Adapter: conecta IPerfilPuestoRepository (domain) con Spring Data JPA.
 * SAD §3.3 SOLID-D: Dependency Inversion.
 */
@Repository
public class PerfilPuestoRepositoryAdapter implements IPerfilPuestoRepository {

    private final JpaPerfilPuestoRepository jpa;

    public PerfilPuestoRepositoryAdapter(JpaPerfilPuestoRepository jpa) {
        this.jpa = jpa;
    }

    @Override public PerfilPuesto save(PerfilPuesto perfilPuesto) { return jpa.save(perfilPuesto); }
    @Override public Optional<PerfilPuesto> findById(Long id) { return jpa.findById(id); }
    @Override public Page<PerfilPuesto> findByEstado(String estado, Pageable pageable) { return jpa.findByEstado(estado, pageable); }
    @Override public Page<PerfilPuesto> findAll(Pageable pageable) { return jpa.findAllOrdered(pageable); }
    @Override public Page<PerfilPuesto> findByIdAreaSolicitante(Long idArea, Pageable pageable) { return jpa.findByIdAreaSolicitante(idArea, pageable); }
    @Override public Page<PerfilPuesto> findByEstadoAndIdAreaSolicitante(String estado, Long idArea, Pageable pageable) { return jpa.findByEstadoAndIdAreaSolicitante(estado, idArea, pageable); }
    @Override public boolean existsById(Long id) { return jpa.existsById(id); }
    @Override public void delete(PerfilPuesto perfil) { jpa.delete(perfil); }
    @Override public long countAprobadosSinRequerimientoVigente() { return jpa.countAprobadosSinRequerimientoVigente(); }
    @Override public long countAprobadosSinRequerimientoVigenteByArea(Long idArea) { return jpa.countAprobadosSinRequerimientoVigenteByArea(idArea); }
    @Override public long countPendientesValidarAprobar() {
        return jpa.countByEstadoIn(Set.of("PENDIENTE", "VALIDADO"));
    }
}
