package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.PostulanteDocumento;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteDocumentoRepository;

import java.util.List;
import java.util.Optional;

@Repository
public class PostulanteDocumentoRepositoryAdapter implements IPostulanteDocumentoRepository {

    private final JpaPostulanteDocumentoRepository jpa;

    public PostulanteDocumentoRepositoryAdapter(JpaPostulanteDocumentoRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public PostulanteDocumento save(PostulanteDocumento entity) {
        return jpa.save(entity);
    }

    @Override
    public List<PostulanteDocumento> findByPostulanteId(Long idPostulante) {
        return jpa.findByPostulante_IdPostulanteAndDeletedAtIsNullOrderByIdDocumentoDesc(idPostulante);
    }

    @Override
    public Optional<PostulanteDocumento> findByIdAndPostulanteId(Long idDocumento, Long idPostulante) {
        return jpa.findByIdDocumentoAndPostulante_IdPostulanteAndDeletedAtIsNull(idDocumento, idPostulante);
    }

    @Override
    public boolean existsActiveByPostulanteIdAndTipoDocumento(Long idPostulante, String tipoDocumento) {
        return jpa.existsByPostulante_IdPostulanteAndTipoDocumentoAndDeletedAtIsNull(idPostulante, tipoDocumento);
    }
}