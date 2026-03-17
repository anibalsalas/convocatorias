package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.PostulanteDocumento;

import java.util.List;
import java.util.Optional;

public interface JpaPostulanteDocumentoRepository extends JpaRepository<PostulanteDocumento, Long> {

    List<PostulanteDocumento> findByPostulante_IdPostulanteAndDeletedAtIsNullOrderByIdDocumentoDesc(
            Long idPostulante
    );

    Optional<PostulanteDocumento> findByIdDocumentoAndPostulante_IdPostulanteAndDeletedAtIsNull(
            Long idDocumento,
            Long idPostulante
    );

    boolean existsByPostulante_IdPostulanteAndTipoDocumentoAndDeletedAtIsNull(
            Long idPostulante,
            String tipoDocumento
    );
}