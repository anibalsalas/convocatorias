package pe.gob.acffaa.sisconv.application.mapper;

import org.springframework.stereotype.Component;
import pe.gob.acffaa.sisconv.application.dto.response.ActaResponse;
import pe.gob.acffaa.sisconv.application.dto.response.ConvocatoriaResponse;
import pe.gob.acffaa.sisconv.domain.model.Acta;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;

/**
 * Mapper entre Convocatoria (domain) y ConvocatoriaResponse (application).
 * SAD §3.2: Application layer — transformación sin lógica de negocio.
 */
@Component
public class ConvocatoriaMapper {

    public ConvocatoriaResponse toResponse(Convocatoria conv) {
        ConvocatoriaResponse.ConvocatoriaResponseBuilder builder = ConvocatoriaResponse.builder()
                .idConvocatoria(conv.getIdConvocatoria())
                .numeroConvocatoria(conv.getNumeroConvocatoria())
                .descripcion(conv.getDescripcion())
                .objetoContratacion(conv.getObjetoContratacion())
                .estado(conv.getEstado())
                .pesoEvalCurricular(conv.getPesoEvalCurricular())
                .pesoEvalTecnica(conv.getPesoEvalTecnica())
                .pesoEntrevista(conv.getPesoEntrevista())
                .fechaPublicacion(conv.getFechaPublicacion())
                .fechaIniPostulacion(conv.getFechaIniPostulacion())
                .fechaFinPostulacion(conv.getFechaFinPostulacion())
                .fechaEvaluacion(conv.getFechaEvaluacion())
                .fechaResultado(conv.getFechaResultado())
                .linkTalentoPeru(conv.getLinkTalentoPeru())
                .linkPortalAcffaa(conv.getLinkPortalAcffaa())
                .fechaCreacion(conv.getFechaCreacion())
                .usuarioCreacion(conv.getUsuarioCreacion());

        if (conv.getRequerimiento() != null) {
            builder.requerimiento(ConvocatoriaResponse.RequerimientoResumen.builder()
                    .idRequerimiento(conv.getRequerimiento().getIdRequerimiento())
                    .numeroRequerimiento(conv.getRequerimiento().getNumeroRequerimiento())
                    .build());
        }

        return builder.build();
    }

    public ActaResponse toActaResponse(Acta acta) {
        return ActaResponse.builder()
                .idActa(acta.getIdActa())
                .tipoActa(acta.getTipoActa())
                .numeroActa(acta.getNumeroActa())
                .fechaActa(acta.getFechaActa())
                .rutaArchivoPdf(acta.getRutaArchivoPdf())
                .estado(acta.getEstado())
                .firmada(acta.getFirmada())
                .fechaCargaFirma(acta.getFechaCargaFirma())
                .build();
    }
}
