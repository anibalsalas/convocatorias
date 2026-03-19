package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Convocatoria CAS — BPMN Etapa 2: Elaboración de Convocatoria.
 * Tabla: TBL_CONVOCATORIA (CU-06, CU-10, CU-11).
 *
 * FK: TBL_REQUERIMIENTO (hereda pesos del Motor RF-14).
 * Hijos: TBL_CRONOGRAMA, TBL_COMITE_SELECCION, TBL_FACTOR_EVALUACION, TBL_ACTA.
 *
 * Estados BPMN: EN_ELABORACION → APROBADA → PUBLICADA → EN_SELECCION → FINALIZADA
 * Constraint: CK_CONV_PESOS (suma pesos = 100.00), CK_CONV_ESTADO
 *
 * Coherencia: DLL_03.sql líneas 372-398, Endpoints_DTOs_v2 §3 (E9-E16)
 */
@Entity
@Table(name = "TBL_CONVOCATORIA")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Convocatoria {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_convocatoria")
    @SequenceGenerator(name = "seq_convocatoria", sequenceName = "SEQ_CONVOCATORIA", allocationSize = 1)
    @Column(name = "ID_CONVOCATORIA")
    private Long idConvocatoria;

    /** Código correlativo: CAS-001-2026 (SEQ_NUM_CONVOCATORIA) */
    @Column(name = "NUMERO_CONVOCATORIA", unique = true, length = 30)
    private String numeroConvocatoria;

    /** FK → TBL_REQUERIMIENTO — Requerimiento CONFIGURADO asociado */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_REQUERIMIENTO", nullable = false)
    private Requerimiento requerimiento;

    @Column(name = "DESCRIPCION", length = 500)
    private String descripcion;

    @Column(name = "OBJETO_CONTRATACION", length = 2000)
    private String objetoContratacion;

    @Column(name = "ANIO")
    private Integer anio;

    // ── Pesos heredados del Motor RF-14 ──

    @Column(name = "PESO_EVAL_CURRICULAR", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal pesoEvalCurricular = new BigDecimal("30.00");

    @Column(name = "PESO_EVAL_TECNICA", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal pesoEvalTecnica = new BigDecimal("35.00");

    @Column(name = "PESO_ENTREVISTA", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal pesoEntrevista = new BigDecimal("35.00");

    // ── Fechas del cronograma principal ──

    @Column(name = "FECHA_PUBLICACION")
    private LocalDate fechaPublicacion;

    @Column(name = "FECHA_INI_POSTULACION")
    private LocalDate fechaIniPostulacion;

    @Column(name = "FECHA_FIN_POSTULACION")
    private LocalDate fechaFinPostulacion;

    @Column(name = "FECHA_EVALUACION")
    private LocalDate fechaEvaluacion;

    @Column(name = "FECHA_RESULTADO")
    private LocalDate fechaResultado;

    // ── Links de publicación (E15) ──

    @Column(name = "LINK_PORTAL_ACFFAA", length = 500)
    private String linkPortalAcffaa;

    @Column(name = "LINK_TALENTO_PERU", length = 500)
    private String linkTalentoPeru;

    // ── Estado BPMN ──

    /** Estados BPMN — máquina de estados en EstadoConvocatoria.puedeTransicionarA() */
    @Enumerated(EnumType.STRING)
    @Column(name = "ESTADO", nullable = false, length = 30)
    @Builder.Default
    private EstadoConvocatoria estado = EstadoConvocatoria.EN_ELABORACION;

    // ── Auditoría ──

    /** Bloqueo optimista — Hibernate incrementa automáticamente (TBL_CONVOCATORIA.VERSION) */
    @Version
    @Column(name = "VERSION")
    private Long version;

    @Column(name = "USUARIO_CREACION", length = 50)
    private String usuarioCreacion;

    @Column(name = "FECHA_CREACION", updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "USUARIO_MODIFICACION", length = 50)
    private String usuarioModificacion;

    @Column(name = "FECHA_MODIFICACION")
    private LocalDateTime fechaModificacion;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
        if (this.anio == null) this.anio = java.time.Year.now().getValue();
    }

    @PreUpdate
    protected void onUpdate() {
        this.fechaModificacion = LocalDateTime.now();
    }
}
