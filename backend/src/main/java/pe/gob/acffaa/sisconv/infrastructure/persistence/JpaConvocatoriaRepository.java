package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;

import java.time.LocalDate;
import java.util.List;

public interface JpaConvocatoriaRepository extends JpaRepository<Convocatoria, Long> {
    Page<Convocatoria> findByEstado(EstadoConvocatoria estado, Pageable pageable);
    Page<Convocatoria> findByEstadoIn(List<EstadoConvocatoria> estados, Pageable pageable);
    Page<Convocatoria> findByEstadoInAndAnio(List<EstadoConvocatoria> estados, Integer anio, Pageable pageable);

    @Query("SELECT c FROM Convocatoria c LEFT JOIN FETCH c.requerimiento r LEFT JOIN FETCH r.perfilPuesto WHERE c.estado IN :estados")
    Page<Convocatoria> findByEstadoInWithPerfil(@Param("estados") List<EstadoConvocatoria> estados, Pageable pageable);

    @Query("SELECT c FROM Convocatoria c LEFT JOIN FETCH c.requerimiento r LEFT JOIN FETCH r.perfilPuesto WHERE c.estado IN :estados AND c.anio = :anio")
    Page<Convocatoria> findByEstadoInAndAnioWithPerfil(@Param("estados") List<EstadoConvocatoria> estados, @Param("anio") Integer anio, Pageable pageable);

    Page<Convocatoria> findByEstadoInAndAnioAndFechaIniPostulacionLessThanEqualAndFechaFinPostulacionGreaterThanEqual(
            List<EstadoConvocatoria> estados,
            Integer anio,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Pageable pageable);

    Page<Convocatoria> findByEstadoInAndFechaIniPostulacionLessThanEqualAndFechaFinPostulacionGreaterThanEqual(
            List<EstadoConvocatoria> estados,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Pageable pageable);

    @Query("SELECT COUNT(c) FROM Convocatoria c WHERE c.anio = :anio")
    long countByAnio(@Param("anio") int anio);

    @Query(value = "SELECT SEQ_NUM_CONVOCATORIA.NEXTVAL FROM DUAL", nativeQuery = true)
    long nextNumeroConvocatoriaSequenceValue();

    boolean existsByRequerimientoIdRequerimiento(Long idRequerimiento);
}