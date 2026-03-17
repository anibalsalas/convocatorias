package pe.gob.acffaa.sisconv.domain.exception;

/**
 * Recurso no encontrado en el dominio
 * SAD §3.2: domain/exception/ResourceNotFoundException
 */
public class ResourceNotFoundException extends DomainException {
    public ResourceNotFoundException(String entity, Long id) {
        super(entity + " no encontrado con ID: " + id);
    }
}
