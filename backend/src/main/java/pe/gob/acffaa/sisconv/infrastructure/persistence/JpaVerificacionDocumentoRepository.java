package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.VerificacionDocumento;
import java.util.List;

public interface JpaVerificacionDocumentoRepository extends JpaRepository<VerificacionDocumento, Long> {
    List<VerificacionDocumento> findByContratoIdContrato(Long idContrato);
    long countByContratoIdContratoAndDocumentoConforme(Long idContrato, String conforme);
}
