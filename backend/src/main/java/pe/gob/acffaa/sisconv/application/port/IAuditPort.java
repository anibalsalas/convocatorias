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
     * D.L. 1451: IP, User-Agent, usuario, timestamp obligatorios
     */
    void registrar(String entidad, Long idEntidad, String accion,
                   String estadoAnterior, String estadoNuevo,
                   HttpServletRequest request, String datosAdicionales);

    /** Sobrecarga simplificada */
    void registrar(String entidad, Long idEntidad, String accion,
                   HttpServletRequest request);

    /** Registro con contexto de convocatoria */
    void registrarConvocatoria(Long idConvocatoria, String entidad, Long idEntidad,
                               String accion, String estadoAnterior, String estadoNuevo,
                               HttpServletRequest request);
}
