package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.gob.acffaa.sisconv.domain.model.PerfilPuesto;

import java.util.Collection;

/**
 * Spring Data JPA Repository para TBL_PERFIL_PUESTO.
 * SAD §3.3: Infrastructure layer — acceso a datos.
 */
public interface JpaPerfilPuestoRepository extends JpaRepository<PerfilPuesto, Long> {

    Page<PerfilPuesto> findByEstado(String estado, Pageable pageable);

    Page<PerfilPuesto> findByIdAreaSolicitante(Long idArea, Pageable pageable);

    @Query("SELECT pp FROM PerfilPuesto pp ORDER BY pp.fechaCreacion DESC")
    Page<PerfilPuesto> findAllOrdered(Pageable pageable);

    /**
     * Cuenta perfiles aprobados que aún no tienen requerimiento vigente asociado.
     * Estados vigentes de requerimiento: ELABORADO, CON_PRESUPUESTO, CONFIGURADO.
     */
    @Query("SELECT COUNT(pp) FROM PerfilPuesto pp WHERE pp.estado = 'APROBADO' " +
            "AND NOT EXISTS (SELECT r FROM Requerimiento r WHERE r.perfilPuesto = pp " +
            "AND r.estado IN ('ELABORADO', 'CON_PRESUPUESTO', 'CONFIGURADO'))")
    long countAprobadosSinRequerimientoVigente();

    /**
     * Cuenta perfiles por estados (ej. PENDIENTE, VALIDADO para ORH).
     * Spring Data JPA derived query — sin @Query explícito.
     */
    long countByEstadoIn(Collection<String> estados);
}
