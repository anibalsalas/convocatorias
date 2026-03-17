package pe.gob.acffaa.sisconv.application.port;

/**
 * Puerto de almacenamiento de archivos — Clean Architecture.
 * Permite implementaciones FileSystem, S3, MinIO sin acoplar el dominio.
 */
public interface IStoragePort {

    void guardar(String rutaRelativa, byte[] contenido);

    byte[] leer(String rutaRelativa);

    void eliminar(String rutaRelativa);

    boolean existe(String rutaRelativa);
}
