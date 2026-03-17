package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.Rol;
import java.util.Optional;
import java.util.List;

/**
 * Puerto de repositorio para Rol — SAD §3.1 Dependency Rule
 */
public interface IRolRepository {
    Optional<Rol> findByCodigoRol(String codigoRol);
    List<Rol> findByEstado(String estado);
}
