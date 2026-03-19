package pe.gob.acffaa.sisconv.application.port;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Puerto de auditoría — SAD §3.3 SOLID-I: Interface Segregation
 * SAD §5.3: Separación de cross-cutting concern de auditoría
 * Implementado en infrastructure/audit/ tanto por AOP como por invocación directa
 */
public interface IAuditPort {

    /**
     * Registra una operación en TBL_LOG_TRANSPARENCIA
     * D.L. 1451: IP, User-Agent, usuario, timestamp y sustento obligatorios
     */
    void registrar(String entidad, Long idEntidad, String accion,
                   String estadoAnterior, String estadoNuevo,
                   HttpServletRequest request, String datosAdicionales);

    /** Sobrecarga simplificada — sustento auto-derivado de la acción */
    void registrar(String entidad, Long idEntidad, String accion,
                   HttpServletRequest request);

    /** Registro con contexto de convocatoria — sustento obligatorio (D.L. 1451) */
    void registrarConvocatoria(Long idConvocatoria, String entidad, Long idEntidad,
                               String accion, String estadoAnterior, String estadoNuevo,
                               String sustento, HttpServletRequest request);
}
