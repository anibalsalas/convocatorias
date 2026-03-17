package pe.gob.acffaa.sisconv.domain.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Puerto de persistencia para TBL_CONVOCATORIA — SAD §3.2 SOLID-D.
 */
public interface IConvocatoriaRepository {
    Convocatoria save(Convocatoria convocatoria);
    Optional<Convocatoria> findById(Long id);
    Page<Convocatoria> findAll(Pageable pageable);
    Page<Convocatoria> findByEstado(String estado, Pageable pageable);
    Page<Convocatoria> findByEstadoInAndAnio(java.util.List<String> estados, Integer anio, Pageable pageable);
    Page<Convocatoria> findByEstadoIn(java.util.List<String> estados, Pageable pageable);
    Page<Convocatoria> findVigentesByEstadoInAndAnio(java.util.List<String> estados, Integer anio, LocalDate fechaActual, Pageable pageable);
    Page<Convocatoria> findVigentesByEstadoIn(java.util.List<String> estados, LocalDate fechaActual, Pageable pageable);
    long countByAnio(int anio);
    long nextNumeroConvocatoriaSequenceValue();
    boolean existsByIdRequerimiento(Long idRequerimiento);
}