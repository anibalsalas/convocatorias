package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.PostulanteConocimiento;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteConocimientoRepository;

import java.util.List;
import java.util.Optional;

@Repository
public class PostulanteConocimientoRepositoryAdapter implements IPostulanteConocimientoRepository {

    private final JpaPostulanteConocimientoRepository jpa;

    public PostulanteConocimientoRepositoryAdapter(JpaPostulanteConocimientoRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public PostulanteConocimiento save(PostulanteConocimiento entity) {
        return jpa.save(entity);
    }

    @Override
    public List<PostulanteConocimiento> findByPostulanteId(Long idPostulante) {
        return jpa.findByPostulante_IdPostulanteAndDeletedAtIsNullOrderByIdConocimientoDesc(idPostulante);
    }

    @Override
    public Optional<PostulanteConocimiento> findByIdAndPostulanteId(Long idConocimiento, Long idPostulante) {
        return jpa.findByIdConocimientoAndPostulante_IdPostulanteAndDeletedAtIsNull(idConocimiento, idPostulante);
    }
}