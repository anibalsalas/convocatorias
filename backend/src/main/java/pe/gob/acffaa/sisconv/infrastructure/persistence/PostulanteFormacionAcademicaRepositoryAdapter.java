package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.PostulanteFormacionAcademica;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteFormacionAcademicaRepository;

import java.util.List;
import java.util.Optional;

@Repository
public class PostulanteFormacionAcademicaRepositoryAdapter
        implements IPostulanteFormacionAcademicaRepository {

    private final JpaPostulanteFormacionAcademicaRepository jpa;

    public PostulanteFormacionAcademicaRepositoryAdapter(
            JpaPostulanteFormacionAcademicaRepository jpa
    ) {
        this.jpa = jpa;
    }

    @Override
    public PostulanteFormacionAcademica save(PostulanteFormacionAcademica entity) {
        return jpa.save(entity);
    }

    @Override
    public List<PostulanteFormacionAcademica> findByPostulanteId(Long idPostulante) {
        return jpa.findByPostulante_IdPostulanteAndDeletedAtIsNullOrderByFechaExpedicionDescIdFormacionAcademicaDesc(idPostulante);
    }

    @Override
    public Optional<PostulanteFormacionAcademica> findByIdAndPostulanteId(
            Long idFormacionAcademica,
            Long idPostulante
    ) {
        return jpa.findByIdFormacionAcademicaAndPostulante_IdPostulanteAndDeletedAtIsNull(
                idFormacionAcademica,
                idPostulante
        );
    }

    @Override
    public List<PostulanteFormacionAcademica> findAllForMigration() {
        return jpa.findPendingBlobMigration();
    }
}