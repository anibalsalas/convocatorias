package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.gob.acffaa.sisconv.domain.model.PostulanteFormacionAcademica;

import java.util.List;
import java.util.Optional;

public interface JpaPostulanteFormacionAcademicaRepository
        extends JpaRepository<PostulanteFormacionAcademica, Long> {

    List<PostulanteFormacionAcademica> findByPostulante_IdPostulanteAndDeletedAtIsNullOrderByFechaExpedicionDescIdFormacionAcademicaDesc(
            Long idPostulante
    );

    Optional<PostulanteFormacionAcademica> findByIdFormacionAcademicaAndPostulante_IdPostulanteAndDeletedAtIsNull(
            Long idFormacionAcademica,
            Long idPostulante
    );

    @Query("SELECT e FROM PostulanteFormacionAcademica e WHERE e.rutaArchivo IS NULL AND e.deletedAt IS NULL")
    List<PostulanteFormacionAcademica> findPendingBlobMigration();
}