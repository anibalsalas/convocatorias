package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.PostulanteConocimiento;

import java.util.List;
import java.util.Optional;

public interface JpaPostulanteConocimientoRepository extends JpaRepository<PostulanteConocimiento, Long> {

    List<PostulanteConocimiento> findByPostulante_IdPostulanteAndDeletedAtIsNullOrderByIdConocimientoDesc(
            Long idPostulante
    );

    Optional<PostulanteConocimiento> findByIdConocimientoAndPostulante_IdPostulanteAndDeletedAtIsNull(
            Long idConocimiento,
            Long idPostulante
    );
}