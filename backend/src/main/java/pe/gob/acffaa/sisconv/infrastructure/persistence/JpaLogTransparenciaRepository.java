package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.LogTransparencia;

/**
 * Implementación JPA del puerto ILogTransparenciaRepository
 */
public interface JpaLogTransparenciaRepository extends JpaRepository<LogTransparencia, Long> {
    Page<LogTransparencia> findByEntidadAndIdEntidad(String entidad, Long idEntidad, Pageable pageable);
    Page<LogTransparencia> findByUsuarioAccion(String usuario, Pageable pageable);
    Page<LogTransparencia> findByIdConvocatoria(Long idConvocatoria, Pageable pageable);
}
