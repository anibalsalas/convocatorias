package pe.gob.acffaa.sisconv.domain.exception;

/**
 * Excepción base de dominio — SAD §3.2: domain/exception/
 * Representa violaciones de reglas de negocio del sistema SISCONV
 */
public class DomainException extends RuntimeException {
    public DomainException(String message) {
        super(message);
    }
}
