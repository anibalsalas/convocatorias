package pe.gob.acffaa.sisconv.application.mapper;

import org.springframework.stereotype.Component;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.domain.model.*;

/**
 * ContratoMapper — PKG-04 Etapa 4.
 * Convierte entities a DTOs response (E32-E37, E44).
 * Nunca expone entidades completas al presentation layer.
 */
@Component
public class ContratoMapper {

    public ContratoResponse toContratoResponse(ContratoCas c, String mensaje) {
        if (c == null) return null;
        Postulante p = c.getPostulacion() != null && c.getPostulacion().getPostulante() != null
                ? c.getPostulacion().getPostulante() : null;
        return ContratoResponse.builder()
                .idContrato(c.getIdContrato())
                .numeroContrato(c.getNumeroContrato())
                .postulante(nombreCompleto(p))
                .estado(c.getEstado())
                .procesoEstado(c.getProcesoEstado())
                .notificacionEnviada(c.getFechaNotificacion() != null)
                .emailEnviadoA(p != null ? p.getEmail() : null)
                .plazoVencimiento(c.getFechaVencimientoDocs())
                .fechaSuscripcion(c.getFechaSuscripcion())
                .fechaInicio(c.getFechaInicio())
                .fechaFin(c.getFechaFin())
                .montoMensual(c.getMontoMensual())
                .esAccesitario("S".equals(c.getEsAccesitario()))
                .ordenConvocado(c.getOrdenConvocado())
                .mensaje(mensaje)
                .build();
    }

    public VerificacionDocsResponse toVerificacionResponse(Long idContrato, int total, int conformes, int noConformes) {
        boolean allOk = noConformes == 0 && total > 0;
        return VerificacionDocsResponse.builder()
                .idContrato(idContrato)
                .totalDocumentos(total)
                .conformes(conformes)
                .noConformes(noConformes)
                .docsVerificados(allOk)
                .mensaje(allOk ? "Documentos verificados. Listo para suscribir."
                        : "Documentos con observaciones. Se rechazarán y convocará accesitario.")
                .build();
    }

    public PlanillaResponse toPlanillaResponse(ContratoCas c) {
        return PlanillaResponse.builder()
                .idContrato(c.getIdContrato())
                .registroPlanilla(c.getRegistroPlanilla())
                .numeroPlanilla(c.getNumeroPlanilla())
                .fechaRegPlanilla(c.getFechaRegPlanilla())
                .mensaje("Registro en planilla completado.")
                .build();
    }

    public NotificacionResponse toNotificacionResponse(Notificacion n) {
        if (n == null) return null;
        return NotificacionResponse.builder()
                .idNotificacion(n.getIdNotificacion())
                .tipoNotificacion(n.getTipoNotificacion())
                .asunto(n.getAsunto())
                .contenido(n.getContenido())
                .estado(n.getEstado())
                .estadoProceso(resolverEstadoProceso(n))
                .fechaCreacion(n.getFechaCreacion())
                .build();
    }

    private String resolverEstadoProceso(Notificacion n) {
        if (n == null) {
            return null;
        }

        String asunto = safeUpper(n.getAsunto());
        String contenido = safeUpper(n.getContenido());

        if (contenido.contains("PENDIENTE DE VERIFICACIÓN PRESUPUESTAL")
                || contenido.contains("REQUIERE VERIFICACIÓN PRESUPUESTAL")
                || asunto.contains("NUEVO REQUERIMIENTO PENDIENTE DE PRESUPUESTO")) {
            return "ELABORADO";
        }

        if (contenido.contains("SIN_PRESUPUESTO")
                || contenido.contains("FUE MARCADO SIN_PRESUPUESTO")
                || contenido.contains("NO CUENTA CON CERTIFICACIÓN PRESUPUESTAL")) {
            return "SIN_PRESUPUESTO";
        }

        if (contenido.contains("CERTIFICACIÓN PRESUPUESTAL")
                || contenido.contains("CUENTA CON CERTIFICACIÓN PRESUPUESTAL")
                || contenido.contains("FUE APROBADO POR OPP")) {
            return "CON_PRESUPUESTO";
        }

        if (contenido.contains("QUEDÓ EN ESTADO CONFIGURADO")
                || contenido.contains("YA PUEDE PASAR A LA ETAPA DE CONVOCATORIA")) {
            return "CONFIGURADO";
        }

        if (contenido.contains("FUE VALIDADO")) {
            return "VALIDADO";
        }

        if (contenido.contains("FUE APROBADO")
                || contenido.contains("YA PUEDE USARSE PARA CREAR REQUERIMIENTO")) {
            return "APROBADO";
        }

        if (contenido.contains("FUE RECHAZADO")) {
            return "RECHAZADO";
        }

        if (n.getConvocatoria() != null && n.getConvocatoria().getEstado() != null) {
            return n.getConvocatoria().getEstado();
        }

        return null;
    }

    private String safeUpper(String value) {
        return value != null ? value.toUpperCase() : "";
    }

    private String nombreCompleto(Postulante p) {
        if (p == null) return "";
        String nc = p.getNombres() + " " + p.getApellidoPaterno();
        if (p.getApellidoMaterno() != null) nc += " " + p.getApellidoMaterno();
        return nc;
    }
}