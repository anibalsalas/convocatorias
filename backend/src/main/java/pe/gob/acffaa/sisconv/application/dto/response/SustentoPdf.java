package pe.gob.acffaa.sisconv.application.dto.response;

/**
 * DTO para respuesta de sustento PDF (nombre + contenido).
 */
public record SustentoPdf(String nombreArchivo, byte[] contenido) {
}
