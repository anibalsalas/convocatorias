package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.AreaOrganizacional;

import java.util.Optional;

/**
 * Puerto de repositorio para áreas organizacionales.
 */
public interface IAreaOrganizacionalRepository {
    Optional<AreaOrganizacional> findById(Long idArea);
    java.util.List<AreaOrganizacional> findAll();
    boolean existsByCodigoArea(String codigoArea);
    AreaOrganizacional save(AreaOrganizacional area);
}
