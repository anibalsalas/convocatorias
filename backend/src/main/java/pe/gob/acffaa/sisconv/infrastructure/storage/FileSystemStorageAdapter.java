package pe.gob.acffaa.sisconv.infrastructure.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pe.gob.acffaa.sisconv.application.port.IStoragePort;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Pattern;

/**
 * Adaptador de almacenamiento en sistema de archivos.
 * Implementa IStoragePort para guardar documentos fuera de la base de datos.
 */
public class FileSystemStorageAdapter implements IStoragePort {

    private static final Logger log = LoggerFactory.getLogger(FileSystemStorageAdapter.class);
    private static final Pattern PATH_TRAVERSAL = Pattern.compile(".*\\.\\..*");

    private final Path basePath;

    public FileSystemStorageAdapter(String basePath) {
        this.basePath = Paths.get(basePath).toAbsolutePath().normalize();
        ensureBaseExists();
    }

    @Override
    public void guardar(String rutaRelativa, byte[] contenido) {
        validateRuta(rutaRelativa);
        Path target = basePath.resolve(rutaRelativa).normalize();
        ensureWithinBase(target);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, contenido);
            log.debug("Archivo guardado: {}", target);
        } catch (IOException e) {
            log.error("Error al guardar archivo en {}: {}", target, e.getMessage());
            throw new DomainException("No se pudo guardar el archivo: " + e.getMessage());
        }
    }

    @Override
    public byte[] leer(String rutaRelativa) {
        validateRuta(rutaRelativa);
        Path target = basePath.resolve(rutaRelativa).normalize();
        ensureWithinBase(target);
        if (!Files.exists(target)) {
            throw new DomainException("Archivo no encontrado: " + rutaRelativa);
        }
        try {
            return Files.readAllBytes(target);
        } catch (IOException e) {
            throw new DomainException("No se pudo leer el archivo: " + e.getMessage());
        }
    }

    @Override
    public void eliminar(String rutaRelativa) {
        validateRuta(rutaRelativa);
        Path target = basePath.resolve(rutaRelativa).normalize();
        ensureWithinBase(target);
        try {
            if (Files.exists(target)) {
                Files.delete(target);
            }
        } catch (IOException e) {
            throw new DomainException("No se pudo eliminar el archivo: " + e.getMessage());
        }
    }

    @Override
    public boolean existe(String rutaRelativa) {
        validateRuta(rutaRelativa);
        Path target = basePath.resolve(rutaRelativa).normalize();
        ensureWithinBase(target);
        return Files.exists(target);
    }

    private void ensureBaseExists() {
        try {
            Files.createDirectories(basePath);
        } catch (IOException e) {
            throw new DomainException("No se pudo crear el directorio base: " + basePath);
        }
    }

    private void validateRuta(String rutaRelativa) {
        if (rutaRelativa == null || rutaRelativa.isBlank()) {
            throw new DomainException("Ruta de archivo inválida");
        }
        if (PATH_TRAVERSAL.matcher(rutaRelativa).matches()
                || rutaRelativa.contains("\\")) {
            throw new DomainException("Ruta de archivo no permitida");
        }
    }

    private void ensureWithinBase(Path target) {
        if (!target.startsWith(basePath)) {
            throw new DomainException("Ruta de archivo fuera del directorio permitido");
        }
    }
}
