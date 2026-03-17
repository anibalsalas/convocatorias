package pe.gob.acffaa.sisconv.domain.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import pe.gob.acffaa.sisconv.domain.model.LogTransparencia;

/**
 * Puerto de repositorio para Log Transparencia — SAD §3.1
 * AF §9 RNF-01: Paginación server-side en todos los GET
 */
public interface ILogTransparenciaRepository {
    LogTransparencia save(LogTransparencia log);
    Page<LogTransparencia> findAll(Pageable pageable);
    Page<LogTransparencia> findByEntidadAndIdEntidad(String entidad, Long idEntidad, Pageable pageable);
    Page<LogTransparencia> findByUsuarioAccion(String usuario, Pageable pageable);
    Page<LogTransparencia> findByIdConvocatoria(Long idConvocatoria, Pageable pageable);
    long count();
}
