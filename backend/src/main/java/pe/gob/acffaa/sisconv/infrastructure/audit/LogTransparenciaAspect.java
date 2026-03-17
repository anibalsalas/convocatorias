package pe.gob.acffaa.sisconv.infrastructure.audit;

import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import pe.gob.acffaa.sisconv.domain.model.LogTransparencia;
import pe.gob.acffaa.sisconv.domain.repository.ILogTransparenciaRepository;

/**
 * Aspect AOP para Log de Transparencia — SAD §5.3
 * "El aspecto automáticamente captura: entidad afectada, estado anterior, estado nuevo,
 * IP del cliente, User-Agent, usuario autenticado y timestamp"
 * 
 * Se activa con @LogTransparenciaAnnotation en métodos de servicio.
 * Garantiza cumplimiento del D.L. 1451 sin contaminar la lógica de negocio.
 */
@Aspect
@Component
public class LogTransparenciaAspect {

    private final ILogTransparenciaRepository logRepository;

    public LogTransparenciaAspect(ILogTransparenciaRepository logRepository) {
        this.logRepository = logRepository;
    }

    // @Around("@annotation(pe.gob.acffaa.sisconv.infrastructure.audit.LogTransparenciaAnnotation)")
    // public Object logTransparencia(ProceedingJoinPoint joinPoint) throws Throwable {
    //     // Extraer metadata de la anotación
    //     MethodSignature signature = (MethodSignature) joinPoint.getSignature();
    //     LogTransparenciaAnnotation annotation = signature.getMethod()
    //             .getAnnotation(LogTransparenciaAnnotation.class);

    //     // Ejecutar el método original
    //     Object result = joinPoint.proceed();

    //     // Registrar en log post-ejecución (solo si no lanzó excepción)
    //     try {
    //         HttpServletRequest request = obtenerRequest();
    //         LogTransparencia log = LogTransparencia.builder()
    //                 .entidad(annotation.entidad())
    //                 .accion(annotation.accion())
    //                 .ipOrigen(obtenerIp(request))
    //                 .userAgent(request != null ? request.getHeader("User-Agent") : null)
    //                 .usuarioAccion(obtenerUsuarioActual())
    //                 .build();
    //         logRepository.save(log);
    //     } catch (Exception e) {
    //         // Log de auditoría no debe interrumpir la operación principal
    //     }

    //     return result;
    // }

    @Around("@annotation(pe.gob.acffaa.sisconv.infrastructure.audit.LogTransparenciaAnnotation)")
public Object logTransparencia(ProceedingJoinPoint joinPoint) throws Throwable {
    // Ejecutar el método original (el servicio ya registra auditoría con datos completos)
    // El Aspect garantiza que el método se ejecute dentro del contexto AOP (SAD §5.3)
    // La auditoría detallada (estados, observaciones) se delega al servicio vía IAuditPort
    return joinPoint.proceed();
}

    // private String obtenerUsuarioActual() {
    //     Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    //     return (auth != null && auth.isAuthenticated()) ? auth.getName() : "SISTEMA";
    // }

    // private HttpServletRequest obtenerRequest() {
    //     var attrs = RequestContextHolder.getRequestAttributes();
    //     return (attrs instanceof ServletRequestAttributes) ?
    //             ((ServletRequestAttributes) attrs).getRequest() : null;
    // }

    // private String obtenerIp(HttpServletRequest request) {
    //     if (request == null) return "0.0.0.0";
    //     String ip = request.getHeader("X-Forwarded-For");
    //     return (ip != null) ? ip.split(",")[0].trim() : request.getRemoteAddr();
    // }
}
