package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.ContratoCas;
import java.util.List;
import java.util.Optional;

/**
 * Puerto de dominio ContratoCas — PKG-04 Etapa 4.
 * SAD §3.2: Domain layer (sin dependencia de Spring Data).
 * Implementado por: infrastructure/persistence/ContratoCasRepositoryAdapter
 */
public interface IContratoCasRepository {
    ContratoCas save(ContratoCas c);
    Optional<ContratoCas> findById(Long id);
    List<ContratoCas> findByConvocatoriaId(Long idConvocatoria);
    Optional<ContratoCas> findByConvocatoriaIdAndProcesoEstado(Long idConvocatoria, String procesoEstado);
    Optional<ContratoCas> findByPostulacionId(Long idPostulacion);
    boolean existsByConvocatoriaIdAndEstadoNot(Long idConvocatoria, String estadoExcluido);
}
