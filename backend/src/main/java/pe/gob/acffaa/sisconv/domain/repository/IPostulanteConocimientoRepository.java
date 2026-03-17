package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.PostulanteConocimiento;

import java.util.List;
import java.util.Optional;

public interface IPostulanteConocimientoRepository {

    PostulanteConocimiento save(PostulanteConocimiento entity);

    List<PostulanteConocimiento> findByPostulanteId(Long idPostulante);

    Optional<PostulanteConocimiento> findByIdAndPostulanteId(Long idConocimiento, Long idPostulante);
}