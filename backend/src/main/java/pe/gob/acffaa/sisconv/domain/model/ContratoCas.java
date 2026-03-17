package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Contrato CAS — BPMN Etapa 4: Suscripción y Registro del Contrato.
 * Tabla: TBL_CONTRATO_CAS (CU-23, CU-24, CU-25, CU-26).
 *
 * FK: TBL_CONVOCATORIA, TBL_POSTULACION.
 * Hijos: TBL_VERIFICACION_DOCUMENTO.
 *
 * Estados: NOTIFICADO → DOCS_VERIFICADOS → SUSCRITO → EN_PLANILLA → CERRADO
 * Proceso:  EN_CURSO | FINALIZADO | DESIERTO
 *
 * Normativa: D.Leg. 1057, D.S. 075-2008-PCM, D.S. 018-2007-TR (planilla máx 5 días)
 * Coherencia: Endpoints_DTOs_v2 §5 (E32-E37), DiagramaFlujo_04 (4.1-4.8)
 */
@Entity
@Table(name = "TBL_CONTRATO_CAS")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContratoCas {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_contrato_cas")
    @SequenceGenerator(name = "seq_contrato_cas", sequenceName = "SEQ_CONTRATO_CAS", allocationSize = 1)
    @Column(name = "ID_CONTRATO")
    private Long idContrato;

    /** Código correlativo: CTO-CAS-001-2026 (SEQ_NUM_CONTRATO) */
    @Column(name = "NUMERO_CONTRATO", unique = true, length = 30)
    private String numeroContrato;

    /** FK → TBL_CONVOCATORIA */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA", nullable = false)
    private Convocatoria convocatoria;

    /** FK → TBL_POSTULACION — Ganador o accesitario convocado */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULACION", nullable = false)
    private Postulacion postulacion;

    // ── Estado del contrato y proceso ──

    /** NOTIFICADO, DOCS_VERIFICADOS, SUSCRITO, EN_PLANILLA, CERRADO */
    @Column(name = "ESTADO", nullable = false, length = 20)
    private String estado;

    /** EN_CURSO, FINALIZADO, DESIERTO */
    @Column(name = "PROCESO_ESTADO", nullable = false, length = 20)
    @Builder.Default
    private String procesoEstado = "EN_CURSO";

    // ── Notificación ganador (E32 — BPMN 4.1) ──

    @Column(name = "FECHA_NOTIFICACION")
    private LocalDateTime fechaNotificacion;

    @Column(name = "PLAZO_DOCUMENTOS_DIAS")
    private Integer plazoDocumentosDias;

    @Column(name = "FECHA_VENCIMIENTO_DOCS")
    private LocalDate fechaVencimientoDocs;

    // ── Verificación docs (E33 — BPMN 4.4) ──

    @Column(name = "DOCS_VERIFICADOS")
    private Boolean docsVerificados;

    // ── Accesitario (E35 — BPMN 4.5) ──

    @Column(name = "ES_ACCESITARIO", length = 1)
    private String esAccesitario;

    @Column(name = "ORDEN_CONVOCADO")
    private Integer ordenConvocado;

    @Column(name = "MOTIVO_CONVOCATORIA", length = 500)
    private String motivoConvocatoria;

    // ── Suscripción (E34 — BPMN 4.6) ──

    @Column(name = "FECHA_SUSCRIPCION")
    private LocalDate fechaSuscripcion;

    @Column(name = "FECHA_INICIO")
    private LocalDate fechaInicio;

    @Column(name = "FECHA_FIN")
    private LocalDate fechaFin;

    @Column(name = "MONTO_MENSUAL", precision = 10, scale = 2)
    private BigDecimal montoMensual;

    @Column(name = "FUNCIONES", length = 2000)
    private String funciones;

    @Column(name = "DEPENDENCIA", length = 200)
    private String dependencia;

    // ── Planilla (E36 — BPMN 4.7) ──

    @Column(name = "NUMERO_PLANILLA", length = 50)
    private String numeroPlanilla;

    @Column(name = "FECHA_REG_PLANILLA")
    private LocalDate fechaRegPlanilla;

    @Column(name = "REGISTRO_PLANILLA")
    private Boolean registroPlanilla;

    // ── Cierre (E37 — BPMN 4.8) ──

    @Column(name = "OBSERVACIONES", length = 1000)
    private String observaciones;

    // ── Auditoría ──

    @Column(name = "FECHA_CREACION")
    private LocalDateTime fechaCreacion;

    @Column(name = "FECHA_MODIFICACION")
    private LocalDateTime fechaModificacion;

    @Column(name = "USUARIO_CREACION", length = 50)
    private String usuarioCreacion;

    @Column(name = "USUARIO_MODIFICACION", length = 50)
    private String usuarioModificacion;

    /** Bloqueo optimista para concurrencia (D.Leg. 1057 — firma bilateral) */
    @Version
    @Column(name = "VERSION")
    private Long version;
}
