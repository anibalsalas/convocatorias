package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Postulacion;
import pe.gob.acffaa.sisconv.domain.repository.IPostulacionRepository;

import java.util.List;
import java.util.Optional;

@Repository
public class PostulacionRepositoryAdapter implements IPostulacionRepository {

    private final JpaPostulacionRepository jpa;

    public PostulacionRepositoryAdapter(JpaPostulacionRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public Postulacion save(Postulacion p) {
        return jpa.save(p);
    }

    @Override
    public Optional<Postulacion> findById(Long id) {
        return jpa.findById(id);
    }

    @Override
    public Optional<Postulacion> findByConvocatoriaIdAndPostulanteId(Long idConv, Long idPost) {
        return jpa.findByConvocatoria_IdConvocatoriaAndPostulante_IdPostulante(idConv, idPost);
    }

    @Override
    public List<Postulacion> findByConvocatoriaId(Long idConv) {
        return jpa.findByConvocatoria_IdConvocatoria(idConv);
    }

    @Override
    public List<Postulacion> findByConvocatoriaIdAndEstado(Long idConv, String estado) {
        return jpa.findByConvocatoria_IdConvocatoriaAndEstado(idConv, estado);
    }

    @Override
    public Page<Postulacion> findByConvocatoriaId(Long idConv, Pageable pageable) {
        return jpa.findByConvocatoria_IdConvocatoria(idConv, pageable);
    }

    @Override
    public Page<Postulacion> findByPostulanteId(Long idPostulante, Pageable pageable) {
        return jpa.findByPostulante_IdPostulante(idPostulante, pageable);
    }

    @Override
    public long countByConvocatoriaId(Long idConv) {
        return jpa.countByConvocatoria_IdConvocatoria(idConv);
    }

    @Override
    public long countByConvocatoriaIdAndEstado(Long idConv, String estado) {
        return jpa.countByConvocatoria_IdConvocatoriaAndEstado(idConv, estado);
    }

    @Override
    public boolean existsByConvocatoriaIdAndEstadoIn(Long idConv, java.util.List<String> estados) {
        return jpa.existsByConvocatoria_IdConvocatoriaAndEstadoIn(idConv, estados);
    }

    @Override
    public List<Postulacion> findByConvocatoriaIdAndEstadoIn(Long idConv, java.util.List<String> estados) {
        return jpa.findByConvocatoria_IdConvocatoriaAndEstadoIn(idConv, estados);
    }

    @Override
    public List<Postulacion> findAptosByConvocatoriaWithPostulante(Long idConv) {
        return jpa.findAptosByConvocatoriaWithPostulante(idConv);
    }
}