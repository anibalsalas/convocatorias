package pe.gob.acffaa.sisconv.domain.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Puerto de persistencia para TBL_CONVOCATORIA — SAD §3.2 SOLID-D.
 */
public interface IConvocatoriaRepository {
    Convocatoria save(Convocatoria convocatoria);
    Optional<Convocatoria> findById(Long id);
    Page<Convocatoria> findAll(Pageable pageable);
    Page<Convocatoria> findByEstado(EstadoConvocatoria estado, Pageable pageable);
    Page<Convocatoria> findByEstadoInAndAnio(List<EstadoConvocatoria> estados, Integer anio, Pageable pageable);
    Page<Convocatoria> findByEstadoIn(List<EstadoConvocatoria> estados, Pageable pageable);
    Page<Convocatoria> findVigentesByEstadoInAndAnio(List<EstadoConvocatoria> estados, Integer anio, LocalDate fechaActual, Pageable pageable);
    Page<Convocatoria> findVigentesByEstadoIn(List<EstadoConvocatoria> estados, LocalDate fechaActual, Pageable pageable);
    long countByAnio(int anio);
    long nextNumeroConvocatoriaSequenceValue();
    boolean existsByIdRequerimiento(Long idRequerimiento);
    long countPendientesComite(String username);
    long countPendientesPublicar();
    List<Convocatoria> findPendientesBancoByArea(Long idArea);

    /** V34 ORH: banco listo, configuracion E26-V pendiente de publicacion. */
    List<Convocatoria> findConvocatoriasBancoCargadoPendienteConfigOrh();

    /** ORH: comité registrado pero aún no notificado a rol COMITE (no COMITE_CONFORMADO). */
    List<Convocatoria> findConvocatoriasPendienteNotificarComiteOrh();
}
