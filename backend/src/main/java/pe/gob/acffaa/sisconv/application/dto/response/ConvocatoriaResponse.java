package pe.gob.acffaa.sisconv.application.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response DTO para Convocatoria — E9, E15, listados.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConvocatoriaResponse {

    private Long idConvocatoria;
    private String numeroConvocatoria;
    private String descripcion;
    private String objetoContratacion;
    private String estado;

    // Pesos heredados del Motor RF-14
    private BigDecimal pesoEvalCurricular;
    private BigDecimal pesoEvalTecnica;
    private BigDecimal pesoEntrevista;

    // Fechas
    private LocalDate fechaPublicacion;
    private LocalDate fechaIniPostulacion;
    private LocalDate fechaFinPostulacion;
    private LocalDate fechaEvaluacion;
    private LocalDate fechaResultado;

    // Links de publicación (E15)
    private String linkTalentoPeru;
    private String linkPortalAcffaa;

    // Auditoría
    private LocalDateTime fechaCreacion;
    private String usuarioCreacion;

    // Requerimiento resumido
    private RequerimientoResumen requerimiento;

    // Flags para habilitación de iconos en lista (plan M02)
    private Boolean cronogramaConformado;
    private Boolean tieneFactoresPeso100;
    private Boolean tieneActaFirmada;
    private Boolean basesGeneradas;

    // Mensaje transaccional
    private String mensaje;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RequerimientoResumen {
        private Long idRequerimiento;
        private String numeroRequerimiento;
    }
}
