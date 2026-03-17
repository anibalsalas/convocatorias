package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.PostulanteExperiencia;

import java.util.List;
import java.util.Optional;

public interface IPostulanteExperienciaRepository {

    PostulanteExperiencia save(PostulanteExperiencia entity);

    List<PostulanteExperiencia> findByPostulanteId(Long idPostulante);

    Optional<PostulanteExperiencia> findByIdAndPostulanteId(Long idExperiencia, Long idPostulante);
}