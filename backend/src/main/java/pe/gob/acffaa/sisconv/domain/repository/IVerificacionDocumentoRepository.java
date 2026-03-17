package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.VerificacionDocumento;
import java.util.List;

/**
 * Puerto de dominio VerificacionDocumento — PKG-04 E33.
 * SAD §3.2: Domain layer.
 */
public interface IVerificacionDocumentoRepository {
    VerificacionDocumento save(VerificacionDocumento v);
    List<VerificacionDocumento> findByContratoId(Long idContrato);
    long countByContratoIdAndConforme(Long idContrato, String conforme);
}
