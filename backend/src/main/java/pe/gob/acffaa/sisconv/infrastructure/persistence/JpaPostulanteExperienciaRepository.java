package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.PostulanteExperiencia;

import java.util.List;
import java.util.Optional;

public interface JpaPostulanteExperienciaRepository extends JpaRepository<PostulanteExperiencia, Long> {

    List<PostulanteExperiencia> findByPostulante_IdPostulanteAndDeletedAtIsNullOrderByFechaFinDescIdExperienciaDesc(
            Long idPostulante
    );

    Optional<PostulanteExperiencia> findByIdExperienciaAndPostulante_IdPostulanteAndDeletedAtIsNull(
            Long idExperiencia,
            Long idPostulante
    );
}