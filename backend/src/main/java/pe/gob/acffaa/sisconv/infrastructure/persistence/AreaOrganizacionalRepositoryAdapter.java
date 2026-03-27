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

    @Override
    public java.util.List<AreaOrganizacional> findAll() {
        return jpaRepository.findAll(org.springframework.data.domain.Sort.by("codigoArea"));
    }

    @Override
    public boolean existsByCodigoArea(String codigoArea) {
        return jpaRepository.existsByCodigoArea(codigoArea);
    }

    @Override
    public AreaOrganizacional save(AreaOrganizacional area) {
        return jpaRepository.save(area);
    }
}
