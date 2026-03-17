package pe.gob.acffaa.sisconv.application.mapper;

import org.springframework.stereotype.Component;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.PerfilPuestoResponse;
import pe.gob.acffaa.sisconv.domain.model.*;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class PerfilPuestoMapper {

    public PerfilPuesto toEntity(PerfilPuestoRequest req, String username) {
        PerfilPuesto pp = PerfilPuesto.builder()
                .nombrePuesto(req.getNombrePuesto())
                .denominacionPuesto(req.getDenominacionPuesto())
                .unidadOrganica(req.getUnidadOrganica())
                .idAreaSolicitante(req.getIdAreaSolicitante())
                .idNivelPuesto(req.getIdNivelPuesto())
                .idNivelFormacion(req.getIdNivelFormacion())
                .dependenciaJerarquicaLineal(req.getDependenciaJerarquicaLineal())
                .dependenciaFuncional(req.getDependenciaFuncional())
                .puestosCargo(req.getPuestosCargo())
                .experienciaGeneral(req.getExperienciaGeneral())
                .experienciaEspecifica(req.getExperienciaEspecifica())
                .habilidades(req.getHabilidades())
                .formacionAcademica(req.getFormacionAcademica())
                .cursosEspecializacion(req.getCursosEspecializacion())
                .conocimientosPuesto(req.getConocimientosPuesto())
                .misionPuesto(req.getMisionPuesto())
                .cantidadPuestos(req.getCantidadPuestos() != null ? req.getCantidadPuestos() : 1)
                .usuarioCreacion(username)
                .build();

        mapFormaciones(req.getFormacionesAcademicas(), pp);
        mapConocimientos(req.getConocimientos(), pp);
        mapExperiencias(req.getExperiencias(), pp);
        mapRequisitos(req.getRequisitos(), pp);
        mapFunciones(req.getFunciones(), pp);
        mapCondicion(req.getCondicion(), pp);
        return pp;
    }

    public PerfilPuestoResponse toResponse(PerfilPuesto pp) {
        return PerfilPuestoResponse.builder()
                .idPerfilPuesto(pp.getIdPerfilPuesto())
                .nombrePuesto(pp.getNombrePuesto())
                .denominacionPuesto(pp.getDenominacionPuesto())
                .unidadOrganica(pp.getUnidadOrganica())
                .idAreaSolicitante(pp.getIdAreaSolicitante())
                .idNivelPuesto(pp.getIdNivelPuesto())
                .idNivelFormacion(pp.getIdNivelFormacion())
                .dependenciaJerarquicaLineal(pp.getDependenciaJerarquicaLineal())
                .dependenciaFuncional(pp.getDependenciaFuncional())
                .puestosCargo(pp.getPuestosCargo())
                .experienciaGeneral(pp.getExperienciaGeneral())
                .experienciaEspecifica(pp.getExperienciaEspecifica())
                .habilidades(pp.getHabilidades())
                .formacionAcademica(pp.getFormacionAcademica())
                .cursosEspecializacion(pp.getCursosEspecializacion())
                .conocimientosPuesto(pp.getConocimientosPuesto())
                .misionPuesto(pp.getMisionPuesto())
                .cantidadPuestos(pp.getCantidadPuestos())
                .estado(pp.getEstado())
                .validadoContraMpp(pp.getValidadoContraMpp())
                .observaciones(pp.getObservaciones())
                .fechaValidacion(pp.getFechaValidacion())
                .usuarioValidacion(pp.getUsuarioValidacion())
                .fechaAprobacion(pp.getFechaAprobacion())
                .usuarioAprobacion(pp.getUsuarioAprobacion())
                .usuarioCreacion(pp.getUsuarioCreacion())
                .fechaCreacion(pp.getFechaCreacion())
                .fechaModificacion(pp.getFechaModificacion())
                .formacionesAcademicas(mapFormaciones(pp.getFormacionesAcademicas()))
                .conocimientos(mapConocimientos(pp.getConocimientos()))
                .experiencias(mapExperiencias(pp.getExperiencias()))
                .requisitos(mapRequisitos(pp.getRequisitos()))
                .funciones(mapFunciones(pp.getFunciones()))
                .condicion(mapCondicion(pp.getCondicion()))
                .build();
    }

    private void mapFormaciones(List<PerfilFormacionAcademicaRequest> requests, PerfilPuesto pp) {
        if (requests == null) {
            return;
        }
        requests.forEach(item -> pp.getFormacionesAcademicas().add(PerfilFormacionAcademica.builder()
                .perfilPuesto(pp)
                .gradoAcademico(item.getGradoAcademico())
                .especialidad(item.getEspecialidad())
                .requiereColegiatura(Boolean.TRUE.equals(item.getRequiereColegiatura()))
                .requiereHabilitacionProfesional(Boolean.TRUE.equals(item.getRequiereHabilitacionProfesional()))
                .orden(item.getOrden() != null ? item.getOrden() : pp.getFormacionesAcademicas().size() + 1)
                .build()));
    }

    private void mapConocimientos(List<PerfilConocimientoRequest> requests, PerfilPuesto pp) {
        if (requests == null) {
            return;
        }
        requests.forEach(item -> pp.getConocimientos().add(PerfilConocimiento.builder()
                .perfilPuesto(pp)
                .tipoConocimiento(item.getTipoConocimiento())
                .descripcion(item.getDescripcion())
                .horas(item.getHoras())
                .nivelDominio(item.getNivelDominio())
                .orden(item.getOrden() != null ? item.getOrden() : pp.getConocimientos().size() + 1)
                .build()));
    }

    private void mapExperiencias(List<PerfilExperienciaRequest> requests, PerfilPuesto pp) {
        if (requests == null) {
            return;
        }
        requests.forEach(item -> pp.getExperiencias().add(PerfilExperiencia.builder()
                .perfilPuesto(pp)
                .tipoExperiencia(item.getTipoExperiencia())
                .cantidad(item.getCantidad())
                .unidadTiempo(item.getUnidadTiempo())
                .nivelMinimoPuesto(item.getNivelMinimoPuesto())
                .detalle(item.getDetalle())
                .orden(item.getOrden() != null ? item.getOrden() : pp.getExperiencias().size() + 1)
                .build()));
    }

    private void mapRequisitos(List<RequisitoPuestoRequest> requests, PerfilPuesto pp) {
        if (requests == null) {
            return;
        }
        requests.forEach(r -> pp.getRequisitos().add(RequisitoPerfil.builder()
                .idTipoRequisito(r.getIdTipoRequisito())
                .descripcion(r.getDescripcion())
                .esObligatorio(r.getEsObligatorio() != null ? r.getEsObligatorio() : "S")
                .orden(r.getOrden() != null ? r.getOrden() : 0)
                .perfilPuesto(pp)
                .build()));
    }

    private void mapFunciones(List<FuncionPuestoRequest> requests, PerfilPuesto pp) {
        if (requests == null) {
            return;
        }
        requests.forEach(f -> pp.getFunciones().add(FuncionPuesto.builder()
                .descripcionFuncion(f.getDescripcionFuncion())
                .orden(f.getOrden() != null ? f.getOrden() : 0)
                .perfilPuesto(pp)
                .build()));
    }

    private void mapCondicion(CondicionPuestoRequest req, PerfilPuesto pp) {
        if (req == null) {
            return;
        }
        pp.setCondicion(CondicionPuesto.builder()
                .remuneracionMensual(req.getRemuneracionMensual())
                .duracionContrato(req.getDuracionContrato())
                .lugarPrestacion(req.getLugarPrestacion())
                .jornadaSemanal(req.getJornadaSemanal() != null ? req.getJornadaSemanal() : 48)
                .otrasCondiciones(req.getOtrasCondiciones())
                .perfilPuesto(pp)
                .build());
    }

    private List<PerfilPuestoResponse.PerfilFormacionAcademicaResponse> mapFormaciones(List<PerfilFormacionAcademica> items) {
        if (items == null) {
            return Collections.emptyList();
        }
        return items.stream()
                .map(item -> PerfilPuestoResponse.PerfilFormacionAcademicaResponse.builder()
                        .idPerfilFormacion(item.getIdPerfilFormacion())
                        .gradoAcademico(item.getGradoAcademico())
                        .especialidad(item.getEspecialidad())
                        .requiereColegiatura(item.getRequiereColegiatura())
                        .requiereHabilitacionProfesional(item.getRequiereHabilitacionProfesional())
                        .orden(item.getOrden())
                        .build())
                .collect(Collectors.toList());
    }

    private List<PerfilPuestoResponse.PerfilConocimientoResponse> mapConocimientos(List<PerfilConocimiento> items) {
        if (items == null) {
            return Collections.emptyList();
        }
        return items.stream()
                .map(item -> PerfilPuestoResponse.PerfilConocimientoResponse.builder()
                        .idPerfilConocimiento(item.getIdPerfilConocimiento())
                        .tipoConocimiento(item.getTipoConocimiento())
                        .descripcion(item.getDescripcion())
                        .horas(item.getHoras())
                        .nivelDominio(item.getNivelDominio())
                        .orden(item.getOrden())
                        .build())
                .collect(Collectors.toList());
    }

    private List<PerfilPuestoResponse.PerfilExperienciaResponse> mapExperiencias(List<PerfilExperiencia> items) {
        if (items == null) {
            return Collections.emptyList();
        }
        return items.stream()
                .map(item -> PerfilPuestoResponse.PerfilExperienciaResponse.builder()
                        .idPerfilExperiencia(item.getIdPerfilExperiencia())
                        .tipoExperiencia(item.getTipoExperiencia())
                        .cantidad(item.getCantidad())
                        .unidadTiempo(item.getUnidadTiempo())
                        .nivelMinimoPuesto(item.getNivelMinimoPuesto())
                        .detalle(item.getDetalle())
                        .orden(item.getOrden())
                        .build())
                .collect(Collectors.toList());
    }

    private List<PerfilPuestoResponse.RequisitoPuestoResponse> mapRequisitos(List<RequisitoPerfil> requisitos) {
        if (requisitos == null) {
            return Collections.emptyList();
        }
        return requisitos.stream()
                .map(r -> PerfilPuestoResponse.RequisitoPuestoResponse.builder()
                        .idRequisitoPerfil(r.getIdRequisitoPerfil())
                        .idTipoRequisito(r.getIdTipoRequisito())
                        .descripcion(r.getDescripcion())
                        .esObligatorio(r.getEsObligatorio())
                        .orden(r.getOrden())
                        .build())
                .collect(Collectors.toList());
    }

    private List<PerfilPuestoResponse.FuncionPuestoResponse> mapFunciones(List<FuncionPuesto> funciones) {
        if (funciones == null) {
            return Collections.emptyList();
        }
        return funciones.stream()
                .map(f -> PerfilPuestoResponse.FuncionPuestoResponse.builder()
                        .idFuncionPuesto(f.getIdFuncionPuesto())
                        .descripcionFuncion(f.getDescripcionFuncion())
                        .orden(f.getOrden())
                        .build())
                .collect(Collectors.toList());
    }

    private PerfilPuestoResponse.CondicionPuestoResponse mapCondicion(CondicionPuesto c) {
        if (c == null) {
            return null;
        }
        return PerfilPuestoResponse.CondicionPuestoResponse.builder()
                .idCondicionPuesto(c.getIdCondicionPuesto())
                .remuneracionMensual(c.getRemuneracionMensual())
                .duracionContrato(c.getDuracionContrato())
                .lugarPrestacion(c.getLugarPrestacion())
                .jornadaSemanal(c.getJornadaSemanal())
                .otrasCondiciones(c.getOtrasCondiciones())
                .build();
    }
}
