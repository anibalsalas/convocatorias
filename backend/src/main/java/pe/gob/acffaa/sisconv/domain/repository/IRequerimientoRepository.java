package pe.gob.acffaa.sisconv.domain.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import pe.gob.acffaa.sisconv.domain.model.Requerimiento;
import java.util.Optional;

/**
 * Puerto de salida para persistencia de Requerimiento — SAD §3.3 SOLID-D.
 * Implementado por RequerimientoRepositoryAdapter en infrastructure.
 */
public interface IRequerimientoRepository {

    Requerimiento save(Requerimiento requerimiento);

    Optional<Requerimiento> findById(Long id);

    Optional<Requerimiento> findByIdWithProfileAndCondition(Long id);
    
    Page<Requerimiento> findAll(Pageable pageable);

    /** Filtro por estado del flujo BPMN */
    Page<Requerimiento> findByEstado(String estado, Pageable pageable);

    /** Filtro por área solicitante */
    Page<Requerimiento> findByIdAreaSolicitante(Long idArea, Pageable pageable);

    boolean existsByNumeroRequerimiento(String numero);

    /** Contar requerimientos del año actual para generar correlativo */
    long countByAnio(int anio);

    /** Cuenta requerimientos ELABORADO pendientes de verificación presupuestal por OPP */
    long countElaboradosPendientesVerificacionPresupuestal();

    /** Cuenta requerimientos por estado (ej. CON_PRESUPUESTO pendientes de motor de reglas) */
    long countByEstado(String estado);
}
