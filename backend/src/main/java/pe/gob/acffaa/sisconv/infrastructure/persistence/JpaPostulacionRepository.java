package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    long countByConvocatoria_IdConvocatoriaAndEstado(Long idConvocatoria, String estado);

    boolean existsByConvocatoria_IdConvocatoriaAndEstadoIn(Long idConvocatoria, java.util.List<String> estados);

    List<Postulacion> findByConvocatoria_IdConvocatoriaAndEstadoIn(Long idConvocatoria, java.util.List<String> estados);

    @Query("SELECT DISTINCT p FROM Postulacion p LEFT JOIN FETCH p.postulante "
            + "WHERE p.convocatoria.idConvocatoria = :idConv "
            + "AND p.estado IN ('APTO', 'GANADOR', 'ACCESITARIO', 'NO_SELECCIONADO')")
    List<Postulacion> findAptosByConvocatoriaWithPostulante(@Param("idConv") Long idConv);
}