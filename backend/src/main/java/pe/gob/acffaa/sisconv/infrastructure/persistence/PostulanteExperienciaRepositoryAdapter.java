package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.PostulanteExperiencia;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteExperienciaRepository;

import java.util.List;
import java.util.Optional;

@Repository
public class PostulanteExperienciaRepositoryAdapter implements IPostulanteExperienciaRepository {

    private final JpaPostulanteExperienciaRepository jpa;

    public PostulanteExperienciaRepositoryAdapter(JpaPostulanteExperienciaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public PostulanteExperiencia save(PostulanteExperiencia entity) {
        return jpa.save(entity);
    }

    @Override
    public List<PostulanteExperiencia> findByPostulanteId(Long idPostulante) {
        return jpa.findByPostulante_IdPostulanteAndDeletedAtIsNullOrderByFechaFinDescIdExperienciaDesc(idPostulante);
    }

    @Override
    public Optional<PostulanteExperiencia> findByIdAndPostulanteId(Long idExperiencia, Long idPostulante) {
        return jpa.findByIdExperienciaAndPostulante_IdPostulanteAndDeletedAtIsNull(idExperiencia, idPostulante);
    }
}