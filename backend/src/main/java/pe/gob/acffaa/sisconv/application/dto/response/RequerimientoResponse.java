package pe.gob.acffaa.sisconv.application.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO de salida para requerimiento de personal CAS.
 * Incluye resumen del perfil asociado, condiciones heredables para convocatoria
 * y resumen del Motor de Reglas RF-14.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RequerimientoResponse {

    private Long idRequerimiento;
    private String numeroRequerimiento;
    private PerfilResumen perfil;
    private Long idAreaSolicitante;
    private String justificacion;
    private Integer cantidadPuestos;
    private Long idUsuarioSolicitante;
    private String estado;

    @Builder.Default
    private Boolean tienePresupuesto = false;

    /** Indica si ya existe una convocatoria vinculada a este requerimiento — candado UI */
    @Builder.Default
    private Boolean tieneConvocatoria = false;

    private String certificacionPresupuestal;
    private String numeroSiaf;
    private String observacionPresupuestal;
    private LocalDate fechaCertPresupuestal;

    private MotorReglasResumen motorReglas;
    private String mensaje;
    private LocalDateTime fechaSolicitud;
    private String usuarioCreacion;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaModificacion;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PerfilResumen {
        private Long idPerfil;
        private String denominacion;
        private String nombrePuesto;
        private String unidadOrganica;
        private CondicionResumen condicion;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CondicionResumen {
        private BigDecimal remuneracionMensual;
        private String lugarPrestacion;
        private String duracionContrato;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MotorReglasResumen {
        private BigDecimal pesoEvalCurricular;
        private BigDecimal pesoEvalTecnica;
        private BigDecimal pesoEntrevista;
        private BigDecimal totalPesos;
        private Integer criteriosRegistrados;
    }
}
