package pe.gob.acffaa.sisconv.infrastructure.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.acffaa.sisconv.application.port.IStoragePort;
import pe.gob.acffaa.sisconv.domain.model.PostulanteFormacionAcademica;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteFormacionAcademicaRepository;

import java.util.List;

/**
 * Migra BLOB existentes a almacenamiento en disco (Parte B).
 * Ejecuta al arranque si hay registros con ARCHIVO_PDF y sin RUTA_ARCHIVO.
 */
@Component
@Order(100)
public class FormacionAcademicaBlobMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FormacionAcademicaBlobMigrationRunner.class);
    private static final String STORAGE_PREFIX = "formacion-academica";

    private final IPostulanteFormacionAcademicaRepository formacionRepository;
    private final IStoragePort storagePort;

    public FormacionAcademicaBlobMigrationRunner(
            IPostulanteFormacionAcademicaRepository formacionRepository,
            IStoragePort storagePort
    ) {
        this.formacionRepository = formacionRepository;
        this.storagePort = storagePort;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            List<PostulanteFormacionAcademica> all = formacionRepository.findAllForMigration();
            int migrated = 0;
            for (PostulanteFormacionAcademica entity : all) {
                if ((entity.getRutaArchivo() == null || entity.getRutaArchivo().isBlank())
                        && entity.getArchivoPdf() != null && entity.getArchivoPdf().length > 0) {
                    String ruta = buildRuta(entity);
                    storagePort.guardar(ruta, entity.getArchivoPdf());
                    entity.setRutaArchivo(ruta);
                    entity.setArchivoPdf(null);
                    formacionRepository.save(entity);
                    migrated++;
                }
            }
            if (migrated > 0) {
                log.info("Migración Parte B: {} registros de formación académica migrados de BLOB a disco", migrated);
            }
        } catch (Exception e) {
            log.warn("Migración Parte B no ejecutada o incompleta: {}", e.getMessage());
        }
    }

    private String buildRuta(PostulanteFormacionAcademica entity) {
        Long idPostulante = entity.getPostulante() != null ? entity.getPostulante().getIdPostulante() : 0L;
        String nombre = entity.getNombreArchivo() != null ? entity.getNombreArchivo() : "sustento.pdf";
        String safeName = nombre.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        if (!safeName.toLowerCase().endsWith(".pdf")) {
            safeName = safeName + ".pdf";
        }
        return String.format("%s/%d/%d_%s", STORAGE_PREFIX, idPostulante, entity.getIdFormacionAcademica(), safeName);
    }
}
