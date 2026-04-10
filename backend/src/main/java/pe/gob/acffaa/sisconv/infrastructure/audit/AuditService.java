package pe.gob.acffaa.sisconv.infrastructure.audit;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.domain.model.LogTransparencia;
import pe.gob.acffaa.sisconv.domain.repository.ILogTransparenciaRepository;

/**
 * Implementación del puerto de auditoría — SAD §3.3 SOLID-D
 * Invocación directa complementaria al Aspect AOP (SAD §5.3)
 * Usado cuando se necesita pasar parámetros específicos (estadoAnterior, estadoNuevo, etc.)
 */
@Service
public class AuditService implements IAuditPort {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);
    private final ILogTransparenciaRepository logRepository;

    public AuditService(ILogTransparenciaRepository logRepository) {
        this.logRepository = logRepository;
    }

    @Override
    public void registrar(String entidad, Long idEntidad, String accion,
                          String estadoAnterior, String estadoNuevo,
                          HttpServletRequest request, String datosAdicionales) {
        try {
            LogTransparencia entry = LogTransparencia.builder()
                    .entidad(entidad)
                    .idEntidad(idEntidad)
                    .accion(accion)
                    .estadoAnterior(estadoAnterior)
                    .estadoNuevo(estadoNuevo)
                    .sustento("Operación " + accion + " sobre " + entidad)
                    .ipOrigen(obtenerIp(request))
                    .userAgent(request != null ? request.getHeader("User-Agent") : null)
                    .usuarioAccion(obtenerUsuarioActual())
                    .datosAdicionales(datosAdicionales)
                    .build();
            logRepository.save(entry);
        } catch (Exception ex) {
            log.error("[AUDIT] Fallo al registrar auditoría — entidad={}, id={}, accion={}: {}",
                    entidad, idEntidad, accion, ex.getMessage(), ex);
        }
    }

    @Override
    public void registrar(String entidad, Long idEntidad, String accion,
                          HttpServletRequest request) {
        registrar(entidad, idEntidad, accion, null, null, request, null);
    }

    @Override
    public void registrarConvocatoria(Long idConvocatoria, String entidad, Long idEntidad,
                                       String accion, String estadoAnterior, String estadoNuevo,
                                       String sustento, HttpServletRequest request) {
        try {
            LogTransparencia entry = LogTransparencia.builder()
                    .idConvocatoria(idConvocatoria)
                    .entidad(entidad)
                    .idEntidad(idEntidad)
                    .accion(accion)
                    .estadoAnterior(estadoAnterior)
                    .estadoNuevo(estadoNuevo)
                    .sustento(sustento)
                    .ipOrigen(obtenerIp(request))
                    .userAgent(request != null ? request.getHeader("User-Agent") : null)
                    .usuarioAccion(obtenerUsuarioActual())
                    .build();
            logRepository.save(entry);
        } catch (Exception ex) {
            log.error("[AUDIT] Fallo al registrar auditoría convocatoria — conv={}, entidad={}, accion={}: {}",
                    idConvocatoria, entidad, accion, ex.getMessage(), ex);
        }
    }

    private String obtenerUsuarioActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.isAuthenticated()) ? auth.getName() : "SISTEMA";
    }

    private String obtenerIp(HttpServletRequest request) {
        if (request == null) return "0.0.0.0";
        String ip = request.getHeader("X-Forwarded-For");
        return (ip != null) ? ip.split(",")[0].trim() : request.getRemoteAddr();
    }
}
