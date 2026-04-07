package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.model.Requerimiento;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.Collection;
import java.util.Optional;

/**
 * Spring Data JPA Repository para TBL_REQUERIMIENTO.
 * SAD §3.3: Infrastructure layer — acceso a datos.
 */
public interface JpaRequerimientoRepository extends JpaRepository<Requerimiento, Long> {

    Page<Requerimiento> findByEstado(String estado, Pageable pageable);

    Page<Requerimiento> findByIdAreaSolicitante(Long idArea, Pageable pageable);

    Page<Requerimiento> findByEstadoAndIdAreaSolicitante(String estado, Long idArea, Pageable pageable);

    boolean existsByNumeroRequerimiento(String numero);

    /** Cuenta requerimientos del año actual para generar correlativo */
    @Query("SELECT COUNT(r) FROM Requerimiento r WHERE YEAR(r.fechaCreacion) = :anio")
    long countByAnio(@Param("anio") int anio);

    /**
     * Indica si existe un requerimiento vigente asociado al perfil.
     */
    boolean existsByPerfilPuesto_IdPerfilPuestoAndEstadoIn(Long idPerfilPuesto, Collection<String> estados);

    /**
     * Obtiene el requerimiento vigente más reciente asociado al perfil.
     */
    Optional<Requerimiento> findFirstByPerfilPuesto_IdPerfilPuestoAndEstadoInOrderByFechaCreacionDesc(
            Long idPerfilPuesto, Collection<String> estados);


            @EntityGraph(attributePaths = {"perfilPuesto", "perfilPuesto.condicion"})
@Query("SELECT r FROM Requerimiento r WHERE r.idRequerimiento = :id")
Optional<Requerimiento> findByIdWithProfileAndCondition(@Param("id") Long id);

    /**
     * Cuenta requerimientos en estado ELABORADO pendientes de verificación presupuestal (OPP).
     * tienePresupuesto IS NULL indica que OPP aún no ha verificado.
     */
    @Query("SELECT COUNT(r) FROM Requerimiento r WHERE r.estado = 'ELABORADO' AND r.tienePresupuesto IS NULL")
    long countElaboradosPendientesVerificacionPresupuestal();

    /**
     * Cuenta requerimientos en estado CON_PRESUPUESTO pendientes de configurar motor de reglas (ORH).
     */
    long countByEstado(String estado);

    /**
     * Cuenta requerimientos CONFIGURADO sin convocatoria asociada.
     * Banner informativo ORH: pendientes de crear convocatoria (Etapa 2).
     */
    @Query("SELECT COUNT(r) FROM Requerimiento r WHERE r.estado = 'CONFIGURADO' " +
           "AND NOT EXISTS (SELECT 1 FROM Convocatoria c WHERE c.requerimiento = r)")
    long countConfiguradosSinConvocatoria();
}
