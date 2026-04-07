package pe.gob.acffaa.sisconv.application.mapper;

import org.springframework.stereotype.Component;
import pe.gob.acffaa.sisconv.application.dto.response.ActaResponse;
import pe.gob.acffaa.sisconv.application.dto.response.ConvocatoriaResponse;
import pe.gob.acffaa.sisconv.domain.model.Acta;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;
import pe.gob.acffaa.sisconv.domain.model.Cronograma;
import java.time.LocalDate;
import java.util.List;

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
                .estado(conv.getEstado() != null ? conv.getEstado().name() : null)
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
                .usuarioCreacion(conv.getUsuarioCreacion())
                .examenVirtualHabilitado(conv.getExamenVirtualHabilitado());

        if (conv.getRequerimiento() != null) {
            builder.requerimiento(ConvocatoriaResponse.RequerimientoResumen.builder()
                    .idRequerimiento(conv.getRequerimiento().getIdRequerimiento())
                    .numeroRequerimiento(conv.getRequerimiento().getNumeroRequerimiento())
                    .build());
        }

        return builder.build();
    }

    /**
     * Sobrecarga que inyecta fechaInicioEvalCurricular desde el cronograma.
     * @param cronogramas lista de cronogramas de esta convocatoria (puede ser null o vacía)
     */
    public ConvocatoriaResponse toResponse(Convocatoria conv, List<Cronograma> cronogramas) {
        ConvocatoriaResponse r = toResponse(conv);
        if (cronogramas != null) {
            LocalDate fecha = cronogramas.stream()
                    .filter(c -> "EVAL_CURRICULAR".equals(c.getEtapa()))
                    .map(Cronograma::getFechaInicio)
                    .findFirst()
                    .orElse(null);
            r.setFechaInicioEvalCurricular(fecha);
        }
        return r;
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
