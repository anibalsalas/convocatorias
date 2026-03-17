package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.VerificacionDocumento;
import pe.gob.acffaa.sisconv.domain.repository.IVerificacionDocumentoRepository;
import java.util.List;

@Repository
public class VerificacionDocumentoRepositoryAdapter implements IVerificacionDocumentoRepository {
    private final JpaVerificacionDocumentoRepository jpa;
    public VerificacionDocumentoRepositoryAdapter(JpaVerificacionDocumentoRepository j) { this.jpa = j; }

    @Override public VerificacionDocumento save(VerificacionDocumento v) { return jpa.save(v); }
    @Override public List<VerificacionDocumento> findByContratoId(Long ic) { return jpa.findByContratoIdContrato(ic); }
    @Override public long countByContratoIdAndConforme(Long ic, String c) { return jpa.countByContratoIdContratoAndDocumentoConforme(ic, c); }
}
