package pe.gob.acffaa.sisconv.application.mapper;

import org.springframework.stereotype.Component;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.domain.model.*;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class SeleccionMapper {

    public PostulanteResponse toPostulanteResponse(Postulante p) {
        if (p == null) return null;
        return PostulanteResponse.builder()
                .idPostulante(p.getIdPostulante())
                .tipoDocumento(p.getTipoDocumento())
                .numeroDocumento(p.getNumeroDocumento())
                .nombreCompleto(nombreCompleto(p))
                .email(p.getEmail())
                .genero(p.getGenero())
                .estado(p.getEstado())
                .esLicenciadoFfaa(p.getEsLicenciadoFfaa())
                .esPersonaDiscap(p.getEsPersonaDiscap())
                .esDeportistaDest(p.getEsDeportistaDest())
                .build();
    }

    public PostulacionResponse toPostulacionResponse(Postulacion post, String mensaje) {
        if (post == null) return null;
    
        String numeroConvocatoria = post.getConvocatoria() != null
                ? post.getConvocatoria().getNumeroConvocatoria()
                : null;
    
        String nombrePuesto = null;
        if (post.getPerfilPuesto() != null) {
            nombrePuesto = post.getPerfilPuesto().getDenominacionPuesto();
        } else if (post.getConvocatoria() != null
                && post.getConvocatoria().getRequerimiento() != null
                && post.getConvocatoria().getRequerimiento().getPerfilPuesto() != null) {
            nombrePuesto = post.getConvocatoria().getRequerimiento().getPerfilPuesto().getDenominacionPuesto();
        }
    
        return PostulacionResponse.builder()
                .idPostulacion(post.getIdPostulacion())
                .idConvocatoria(post.getConvocatoria() != null ? post.getConvocatoria().getIdConvocatoria() : null)
                .idPerfilPuesto(post.getPerfilPuesto() != null ? post.getPerfilPuesto().getIdPerfilPuesto() : null)
                .numeroConvocatoria(numeroConvocatoria)
                .nombrePuesto(nombrePuesto)
                .postulante(toPostulanteResponse(post.getPostulante()))
                .estado(post.getEstado())
                .admisionRf07(post.getAdmisionRf07())
                .codigoAnonimo(post.getCodigoAnonimo())
                .verificacionRnssc(post.getVerificacionRnssc())
                .verificacionRegiprec(post.getVerificacionRegiprec())
                .fechaVerificacionDl(post.getFechaVerificacionDl())
                .observacionDl(post.getObservacionDl())
                .puntajeCurricular(post.getPuntajeCurricular())
                .puntajeTecnica(post.getPuntajeTecnica())
                .puntajeEntrevista(post.getPuntajeEntrevista())
                .puntajeBonificacion(post.getPuntajeBonificacion())
                .puntajeTotal(post.getPuntajeTotal())
                .ordenMerito(post.getOrdenMerito())
                .resultado(post.getResultado())
                .fechaPostulacion(post.getFechaPostulacion())
                .fechaConfirmacionExpediente(post.getFechaConfirmacionExpediente())
                .mensaje(mensaje)
                .build();
    }

    /** Sobrecarga que enriquece el response con el desglose de scores por subcriterio curricular */
    public PostulacionResponse toPostulacionResponse(Postulacion post, List<EvaluacionCurricular> evals, String mensaje) {
        PostulacionResponse r = toPostulacionResponse(post, mensaje);
        if (r != null && evals != null && !evals.isEmpty()) {
            r.setEvaluacionesCurriculares(
                evals.stream()
                    .map(e -> PostulacionResponse.EvalCurricularItem.builder()
                            .idFactor(e.getFactor().getIdFactor())
                            .puntajeObtenido(e.getPuntajeObtenido())
                            .build())
                    .collect(Collectors.toList())
            );
        }
        return r;
    }

    public TachaResponse toTachaResponse(Tacha t, String mensaje) {
        if (t == null) return null;
        return TachaResponse.builder()
                .idTacha(t.getIdTacha())
                .idPostulacion(t.getPostulacion() != null ? t.getPostulacion().getIdPostulacion() : null)
                .idConvocatoria(t.getConvocatoria() != null ? t.getConvocatoria().getIdConvocatoria() : null)
                .motivo(t.getMotivo())
                .evidencia(t.getEvidencia())
                .rutaAdjunto(t.getRutaAdjunto())
                .estado(t.getEstado())
                .resolucion(t.getResolucion())
                .fechaPresentacion(t.getFechaPresentacion())
                .fechaResolucion(t.getFechaResolucion())
                .mensaje(mensaje)
                .build();
    }

    public ExpedienteResponse toExpedienteResponse(ExpedienteVirtual e, String mensaje) {
        if (e == null) return null;
        return ExpedienteResponse.builder()
                .idExpediente(e.getIdExpediente())
                .idPostulacion(e.getPostulacion() != null ? e.getPostulacion().getIdPostulacion() : null)
                .tipoDocumento(e.getTipoDocumento())
                .nombreArchivo(e.getNombreArchivo())
                .rutaArchivo(e.getRutaArchivo())
                .hashSha256(e.getHashSha256())
                .verificado(e.getVerificado())
                .fechaVerificacion(e.getFechaVerificacion())
                .fechaCarga(e.getFechaCarga())
                .tamanoKb(e.getTamanoKb())
                .estado(e.getEstado())
                .mensaje(mensaje)
                .build();
    }

    public String nombreCompleto(Postulante p) {
        if (p == null) return "";
        String nc = p.getNombres() + " " + p.getApellidoPaterno();
        if (p.getApellidoMaterno() != null) nc += " " + p.getApellidoMaterno();
        return nc;
    }
}