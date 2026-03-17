package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.PostulanteDocumento;

import java.util.List;
import java.util.Optional;

public interface IPostulanteDocumentoRepository {

    PostulanteDocumento save(PostulanteDocumento entity);

    List<PostulanteDocumento> findByPostulanteId(Long idPostulante);

    Optional<PostulanteDocumento> findByIdAndPostulanteId(Long idDocumento, Long idPostulante);

    boolean existsActiveByPostulanteIdAndTipoDocumento(Long idPostulante, String tipoDocumento);
}