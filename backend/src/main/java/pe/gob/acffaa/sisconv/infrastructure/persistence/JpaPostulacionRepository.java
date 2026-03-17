package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.Postulacion;

import java.util.List;
import java.util.Optional;

public interface JpaPostulacionRepository extends JpaRepository<Postulacion, Long> {

    Optional<Postulacion> findByConvocatoria_IdConvocatoriaAndPostulante_IdPostulante(
            Long idConvocatoria,
            Long idPostulante
    );

    List<Postulacion> findByConvocatoria_IdConvocatoria(Long idConvocatoria);

    List<Postulacion> findByConvocatoria_IdConvocatoriaAndEstado(
            Long idConvocatoria,
            String estado
    );

    Page<Postulacion> findByConvocatoria_IdConvocatoria(
            Long idConvocatoria,
            Pageable pageable
    );

    Page<Postulacion> findByPostulante_IdPostulante(
            Long idPostulante,
            Pageable pageable
    );

    long countByConvocatoria_IdConvocatoria(Long idConvocatoria);
}