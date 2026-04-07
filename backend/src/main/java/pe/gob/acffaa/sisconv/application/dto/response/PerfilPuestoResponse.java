package pe.gob.acffaa.sisconv.application.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PerfilPuestoResponse {

    private Long idPerfilPuesto;
    private String nombrePuesto;
    private String denominacionPuesto;
    private String unidadOrganica;
    private Long idAreaSolicitante;
    private Long idNivelPuesto;
    private Long idNivelFormacion;
    private String experienciaGeneral;
    private String experienciaEspecifica;
    private String habilidades;
    private String formacionAcademica;
    private String cursosEspecializacion;
    private String conocimientosPuesto;
    private String misionPuesto;
    private Integer cantidadPuestos;
    private String estado;
    private Boolean validadoContraMpp;
    private String observaciones;
    private LocalDateTime fechaValidacion;
    private String usuarioValidacion;
    private LocalDateTime fechaAprobacion;
    private String usuarioAprobacion;
    private String usuarioCreacion;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaModificacion;
    private Boolean tieneRequerimientoAsociado;
    private String estadoRequerimientoAsociado;
    private List<PerfilFormacionAcademicaResponse> formacionesAcademicas;
    private List<PerfilConocimientoResponse> conocimientos;
    private List<PerfilExperienciaResponse> experiencias;
    private List<RequisitoPuestoResponse> requisitos;
    private List<FuncionPuestoResponse> funciones;
    private CondicionPuestoResponse condicion;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PerfilFormacionAcademicaResponse {
        private Long idPerfilFormacion;
        private String gradoAcademico;
        private String especialidad;
        private Boolean requiereColegiatura;
        private Boolean requiereHabilitacionProfesional;
        private Integer orden;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PerfilConocimientoResponse {
        private Long idPerfilConocimiento;
        private String tipoConocimiento;
        private String descripcion;
        private Integer horas;
        private String nivelDominio;
        private Integer orden;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PerfilExperienciaResponse {
        private Long idPerfilExperiencia;
        private String tipoExperiencia;
        private Integer cantidad;
        private String unidadTiempo;
        private String nivelMinimoPuesto;
        private String detalle;
        private Integer orden;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RequisitoPuestoResponse {
        private Long idRequisitoPerfil;
        private Long idTipoRequisito;
        private String descripcion;
        private String esObligatorio;
        private Integer orden;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FuncionPuestoResponse {
        private Long idFuncionPuesto;
        private String descripcionFuncion;
        private Integer orden;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CondicionPuestoResponse {
        private Long idCondicionPuesto;
        private java.math.BigDecimal remuneracionMensual;
        private String duracionContrato;
        private String lugarPrestacion;
        private Integer jornadaSemanal;
        private String otrasCondiciones;
        /** V16 — horario y modalidad (Bases PDF sección IV). */
        private String horarioInicio;
        private String horarioFin;
        private String diasLaborales;
        private String modalidadServicio;
        private String tipoInicioContrato;
    }
}
