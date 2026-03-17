package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.ReglaMotor;
import pe.gob.acffaa.sisconv.domain.repository.IReglaMotorRepository;

import java.util.List;

/**
 * Adapter: conecta IReglaMotorRepository (domain) con Spring Data JPA.
 * SAD §3.3 SOLID-D: Dependency Inversion.
 */
@Repository
public class ReglaMotorRepositoryAdapter implements IReglaMotorRepository {

    private final JpaReglaMotorRepository jpa;

    public ReglaMotorRepositoryAdapter(JpaReglaMotorRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public ReglaMotor save(ReglaMotor regla) { return jpa.save(regla); }

    @Override
    public List<ReglaMotor> saveAll(List<ReglaMotor> reglas) { return jpa.saveAll(reglas); }

    @Override
    public List<ReglaMotor> findByIdRequerimiento(Long idRequerimiento) {
        return jpa.findByIdRequerimiento(idRequerimiento);
    }

    @Override
    public void deleteByIdRequerimiento(Long idRequerimiento) {
        jpa.deleteByIdRequerimiento(idRequerimiento);
    }
}
