package pe.gob.acffaa.sisconv.infrastructure.audit;

import java.lang.annotation.*;

/**
 * Anotación para marcar métodos que deben registrarse en el Log de Transparencia
 * SAD §5.3: "Cada transición de estado se intercepta mediante un Aspect (Spring AOP)
 * anotado con @LogTransparencia"
 * D.L. 1451: Trazabilidad obligatoria
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface LogTransparenciaAnnotation {
    /** Nombre de la entidad afectada (TBL_USUARIO, TBL_CONVOCATORIA, etc.) */
    String entidad();

    /** Acción ejecutada (CREAR, ACTUALIZAR, DESACTIVAR, APROBAR, etc.) */
    String accion();
}
