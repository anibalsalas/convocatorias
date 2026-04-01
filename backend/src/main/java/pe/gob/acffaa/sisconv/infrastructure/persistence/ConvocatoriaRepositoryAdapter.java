package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;
import pe.gob.acffaa.sisconv.domain.repository.IConvocatoriaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public class ConvocatoriaRepositoryAdapter implements IConvocatoriaRepository {
    private final JpaConvocatoriaRepository jpa;

    public ConvocatoriaRepositoryAdapter(JpaConvocatoriaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public Convocatoria save(Convocatoria convocatoria) {
        return jpa.save(convocatoria);
    }

    @Override
    public Optional<Convocatoria> findById(Long id) {
        return jpa.findById(id);
    }

    @Override
    public Page<Convocatoria> findAll(Pageable pageable) {
        return jpa.findAll(pageable);
    }

    @Override
    public Page<Convocatoria> findByEstado(EstadoConvocatoria estado, Pageable pageable) {
        return jpa.findByEstado(estado, pageable);
    }

    @Override
    public Page<Convocatoria> findByEstadoIn(List<EstadoConvocatoria> estados, Pageable pageable) {
        return jpa.findByEstadoIn(estados, pageable);
    }

    @Override
    public Page<Convocatoria> findByEstadoInAndAnio(List<EstadoConvocatoria> estados, Integer anio, Pageable pageable) {
        return jpa.findByEstadoInAndAnio(estados, anio, pageable);
    }

    @Override
    public Page<Convocatoria> findVigentesByEstadoInAndAnio(
            List<EstadoConvocatoria> estados,
            Integer anio,
            LocalDate fechaActual,
            Pageable pageable) {
        return jpa.findByEstadoInAndAnioAndFechaIniPostulacionLessThanEqualAndFechaFinPostulacionGreaterThanEqual(
                estados,
                anio,
                fechaActual,
                fechaActual,
                pageable);
    }

    @Override
    public Page<Convocatoria> findVigentesByEstadoIn(
            List<EstadoConvocatoria> estados,
            LocalDate fechaActual,
            Pageable pageable) {
        return jpa.findByEstadoInAndFechaIniPostulacionLessThanEqualAndFechaFinPostulacionGreaterThanEqual(
                estados,
                fechaActual,
                fechaActual,
                pageable);
    }

    @Override
    public long countByAnio(int anio) {
        return jpa.countByAnio(anio);
    }

    @Override
    public long nextNumeroConvocatoriaSequenceValue() {
        return jpa.nextNumeroConvocatoriaSequenceValue();
    }

    @Override
    public boolean existsByIdRequerimiento(Long idRequerimiento) {
        return jpa.existsByRequerimientoIdRequerimiento(idRequerimiento);
    }

    @Override
    public long countPendientesComite(String username) {
        return jpa.countPendientesComite(username);
    }

    @Override
    public long countPendientesPublicar() {
        return jpa.countPendientesPublicar();
    }
}