package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.PostulanteFormacionAcademica;

import java.util.List;
import java.util.Optional;

public interface IPostulanteFormacionAcademicaRepository {

    PostulanteFormacionAcademica save(PostulanteFormacionAcademica entity);

    List<PostulanteFormacionAcademica> findByPostulanteId(Long idPostulante);

    Optional<PostulanteFormacionAcademica> findByIdAndPostulanteId(Long idFormacionAcademica, Long idPostulante);

    List<PostulanteFormacionAcademica> findAllForMigration();
}