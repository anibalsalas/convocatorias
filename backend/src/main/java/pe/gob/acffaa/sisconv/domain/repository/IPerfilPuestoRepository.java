package pe.gob.acffaa.sisconv.domain.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import pe.gob.acffaa.sisconv.domain.model.PerfilPuesto;
import java.util.Optional;

/**
 * Puerto de salida para persistencia de PerfilPuesto — SAD §3.3 SOLID-D.
 * Implementado por PerfilPuestoRepositoryAdapter en infrastructure.
 */
public interface IPerfilPuestoRepository {

    PerfilPuesto save(PerfilPuesto perfilPuesto);

    Optional<PerfilPuesto> findById(Long id);

    /** Listado paginado con filtro por estado */
    Page<PerfilPuesto> findByEstado(String estado, Pageable pageable);

    /** Listado paginado general */
    Page<PerfilPuesto> findAll(Pageable pageable);

    /** Listado por área solicitante */
    Page<PerfilPuesto> findByIdAreaSolicitante(Long idArea, Pageable pageable);

    boolean existsById(Long id);

    void delete(PerfilPuesto perfil);

    /** Cuenta perfiles aprobados sin requerimiento vigente asociado */
    long countAprobadosSinRequerimientoVigente();

    /** Cuenta perfiles pendientes de validar o aprobar por ORH (estados PENDIENTE, VALIDADO) */
    long countPendientesValidarAprobar();
}
