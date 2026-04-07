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

    // Flag E24 — COMITÉ ya registró resultados de evaluación curricular (hay postulantes con puntaje)
    private Boolean resultadosEvalCurricularRegistrados;

    // Flag E24 — ORH ya subió el PDF firmado digitalmente
    private Boolean pdfFirmadoE24Subido;

    // Fecha de subida del PDF firmado E24
    private String fechaPdfFirmadoE24;

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

    /** True si existe comité en EN_ELABORACION y aún no está COMITE_CONFORMADO (ORH debe «Notificar a Comité»). */
    private Boolean comitePendienteNotificarOrh;

    /** E15 / E16 — ORH ya cargó el PDF de bases firmado antes de publicar. */
    private Boolean basesFirmadasSubidas;

    /** Fecha/hora de registro del PDF de bases firmado. */
    private String fechaPdfBasesFirmado;

    /** True si existe al menos una fila en TBL_CUADRO_MERITOS (E29 ejecutado). */
    private Boolean cuadroMeritosCalculado;

    // Flag E28 — ORH ejecutó bonificaciones RF-15 (gate para habilitar E29/E31)
    private Boolean bonificacionesCalculadas;

    // Flag E26 — ORH ya subió el PDF firmado de resultados técnicos
    private Boolean pdfFirmadoE26Subido;

    // Fecha de subida del PDF firmado E26
    private String fechaPdfFirmadoE26;

    // V34 — true si la evaluación técnica usa modalidad virtual
    private Boolean examenVirtualHabilitado;

    // Fecha inicio de etapa EVAL_CURRICULAR del cronograma — gate para botón "Ver Postulantes" en Selección
    private LocalDate fechaInicioEvalCurricular;

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
