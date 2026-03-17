package pe.gob.acffaa.sisconv.application.mapper;

import org.springframework.stereotype.Component;
import pe.gob.acffaa.sisconv.application.dto.response.RequerimientoResponse;
import pe.gob.acffaa.sisconv.application.dto.response.RequerimientoResponse.CondicionResumen;
import pe.gob.acffaa.sisconv.application.dto.response.RequerimientoResponse.MotorReglasResumen;
import pe.gob.acffaa.sisconv.application.dto.response.RequerimientoResponse.PerfilResumen;
import pe.gob.acffaa.sisconv.domain.model.ReglaMotor;
import pe.gob.acffaa.sisconv.domain.model.Requerimiento;

import java.math.BigDecimal;
import java.util.List;

@Component
public class RequerimientoMapper {

    public RequerimientoResponse toResponse(Requerimiento req) {
        RequerimientoResponse.RequerimientoResponseBuilder builder = RequerimientoResponse.builder()
                .idRequerimiento(req.getIdRequerimiento())
                .numeroRequerimiento(req.getNumeroRequerimiento())
                .idAreaSolicitante(req.getIdAreaSolicitante())
                .justificacion(req.getJustificacion())
                .cantidadPuestos(req.getCantidadPuestos())
                .idUsuarioSolicitante(req.getIdUsuarioSolicitante())
                .estado(req.getEstado())
                .tienePresupuesto(req.getTienePresupuesto() != null ? req.getTienePresupuesto() : false)
                .fechaSolicitud(req.getFechaSolicitud())
                .usuarioCreacion(req.getUsuarioCreacion())
                .fechaCreacion(req.getFechaCreacion())
                .fechaModificacion(req.getFechaModificacion());

        if (req.getPerfilPuesto() != null) {
            CondicionResumen condicion = null;
            if (req.getPerfilPuesto().getCondicion() != null) {
                condicion = CondicionResumen.builder()
                        .remuneracionMensual(req.getPerfilPuesto().getCondicion().getRemuneracionMensual())
                        .lugarPrestacion(req.getPerfilPuesto().getCondicion().getLugarPrestacion())
                        .duracionContrato(req.getPerfilPuesto().getCondicion().getDuracionContrato())
                        .build();
            }

            builder.perfil(PerfilResumen.builder()
                    .idPerfil(req.getPerfilPuesto().getIdPerfilPuesto())
                    .denominacion(req.getPerfilPuesto().getDenominacionPuesto())
                    .nombrePuesto(req.getPerfilPuesto().getNombrePuesto())
                    .unidadOrganica(req.getPerfilPuesto().getUnidadOrganica())
                    .condicion(condicion)
                    .build());
        }

        if (req.getCertificacionPresupuestal() != null) {
            builder.certificacionPresupuestal(req.getCertificacionPresupuestal())
                    .numeroSiaf(req.getNumeroSiaf())
                    .observacionPresupuestal(req.getObservacionPresupuestal())
                    .fechaCertPresupuestal(req.getFechaCertPresupuestal());
        }

        return builder.build();
    }

    public RequerimientoResponse toResponseConMotor(Requerimiento req, List<ReglaMotor> reglas) {
        RequerimientoResponse response = toResponse(req);

        if (reglas != null && !reglas.isEmpty()) {
            BigDecimal pesoCurricular = BigDecimal.ZERO;
            BigDecimal pesoTecnica = BigDecimal.ZERO;
            BigDecimal pesoEntrevista = BigDecimal.ZERO;
            int criterios = 0;

            for (ReglaMotor regla : reglas) {
                if ("CALCULO".equals(regla.getTipoRegla())) {
                    switch (regla.getEtapaEvaluacion()) {
                        case "CURRICULAR":
                            pesoCurricular = regla.getPeso();
                            break;
                        case "TECNICA":
                            pesoTecnica = regla.getPeso();
                            break;
                        case "ENTREVISTA":
                            pesoEntrevista = regla.getPeso();
                            break;
                        default:
                            break;
                    }
                } else if ("FILTRO".equals(regla.getTipoRegla())) {
                    criterios++;
                }
            }

            response.setMotorReglas(MotorReglasResumen.builder()
                    .pesoEvalCurricular(pesoCurricular)
                    .pesoEvalTecnica(pesoTecnica)
                    .pesoEntrevista(pesoEntrevista)
                    .totalPesos(pesoCurricular.add(pesoTecnica).add(pesoEntrevista))
                    .criteriosRegistrados(criterios)
                    .build());
        }

        return response;
    }
}
