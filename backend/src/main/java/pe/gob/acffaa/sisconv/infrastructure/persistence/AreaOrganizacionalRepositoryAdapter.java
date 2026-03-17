package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.AreaOrganizacional;
import pe.gob.acffaa.sisconv.domain.repository.IAreaOrganizacionalRepository;

import java.util.Optional;

@Repository
public class AreaOrganizacionalRepositoryAdapter implements IAreaOrganizacionalRepository {

    private final JpaAreaOrganizacionalRepository jpaRepository;

    public AreaOrganizacionalRepositoryAdapter(JpaAreaOrganizacionalRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Optional<AreaOrganizacional> findById(Long idArea) {
        return jpaRepository.findById(idArea);
    }
}
