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

    // Flag E24 — ORH publicó resultados de evaluación curricular
    private Boolean resultadosCurricularPublicados;

    // Flag E25 — ORH notificó al COMITÉ que los códigos anónimos están listos
    private Boolean notificacionCodigosEnviada;

    // Flag E26 — COMITÉ publicó resultados de evaluación técnica
    private Boolean resultadosTecnicosPublicados;

    // Flag E27 — COMITÉ publicó resultados de entrevista personal
    private Boolean entrevistaPublicada;

    // Flag E27 — COMITÉ notificó a ORH que la entrevista está lista para E28/E31
    private Boolean notificacionEntrevistaEnviada;

    // Flag E14 — COMITÉ notificó a ORH que el acta está firmada y la convocatoria lista para publicar
    private Boolean notificacionActaEnviada;

    // Flag E28 — ORH ejecutó bonificaciones RF-15 (gate para habilitar E29/E31)
    private Boolean bonificacionesCalculadas;

    // Contador de postulantes en estado REGISTRADO (pendientes de verificar E19) — solo PUBLICADA
    private Integer postulantesRegistrados;

    // Contador de postulantes en estado VERIFICADO (pasaron E20, listos para E24) — solo EN_SELECCION
    private Integer postulantesVerificados;

    // Contador de postulantes en estado APTO (pasaron E24, listos para E25 códigos anónimos) — solo EN_SELECCION
    private Integer postulantesAptos;

    // Mensaje transaccional
    private String mensaje;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RequerimientoResumen {
        private Long idRequerimiento;
        private String numeroRequerimiento;
    }
}
