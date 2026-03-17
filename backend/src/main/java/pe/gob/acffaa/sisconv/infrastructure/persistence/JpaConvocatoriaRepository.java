package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;

import java.time.LocalDate;

public interface JpaConvocatoriaRepository extends JpaRepository<Convocatoria, Long> {
    Page<Convocatoria> findByEstado(String estado, Pageable pageable);
    Page<Convocatoria> findByEstadoIn(java.util.List<String> estados, Pageable pageable);
    Page<Convocatoria> findByEstadoInAndAnio(java.util.List<String> estados, Integer anio, Pageable pageable);

    Page<Convocatoria> findByEstadoInAndAnioAndFechaIniPostulacionLessThanEqualAndFechaFinPostulacionGreaterThanEqual(
            java.util.List<String> estados,
            Integer anio,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Pageable pageable);

    Page<Convocatoria> findByEstadoInAndFechaIniPostulacionLessThanEqualAndFechaFinPostulacionGreaterThanEqual(
            java.util.List<String> estados,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Pageable pageable);

    @Query("SELECT COUNT(c) FROM Convocatoria c WHERE c.anio = :anio")
    long countByAnio(@Param("anio") int anio);

    @Query(value = "SELECT SEQ_NUM_CONVOCATORIA.NEXTVAL FROM DUAL", nativeQuery = true)
    long nextNumeroConvocatoriaSequenceValue();

    boolean existsByRequerimientoIdRequerimiento(Long idRequerimiento);
}