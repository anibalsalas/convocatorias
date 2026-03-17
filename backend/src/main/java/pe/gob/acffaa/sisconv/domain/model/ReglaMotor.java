package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Regla del Motor de Evaluación RF-14 — BPMN Etapa 1: Configurar Pesos Ponderados.
 * Tabla: TBL_REGLA_MOTOR (V7 DDL).
 *
 * Cada requerimiento CONFIGURADO tiene N reglas:
 *   - 3 reglas CALCULO (peso + umbral por etapa: CURRICULAR/TECNICA/ENTREVISTA)
 *   - N reglas FILTRO (criterios curriculares detallados)
 *
 * CU-05: "ORH define pesos (sum=100%), umbrales mínimos, criterios curriculares"
 * Coherencia: Endpoints_DTOs_v2 §2 E8, Vista CU (CU-05), Diagrama Flujo Etapa 1
 *
 * @see pe.gob.acffaa.sisconv.application.service.RequerimientoService#configurarReglas
 */
@Entity
@Table(name = "TBL_REGLA_MOTOR")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReglaMotor {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_regla_motor")
    @SequenceGenerator(name = "seq_regla_motor", sequenceName = "SEQ_REGLA_MOTOR", allocationSize = 1)
    @Column(name = "ID_REGLA")
    private Long idRegla;

    /** FK → TBL_REQUERIMIENTO.ID_REQUERIMIENTO */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_REQUERIMIENTO", nullable = false)
    private Requerimiento requerimiento;

    /** FILTRO | CALCULO | BONIFICACION | VALIDACION — CHECK TBL_RM_CK_TIPO */
    @Column(name = "TIPO_REGLA", nullable = false, length = 20)
    private String tipoRegla;

    /** Nombre descriptivo: "Peso Eval. Curricular", "Formación académica" */
    @Column(name = "NOMBRE_REGLA", nullable = false, length = 200)
    private String nombreRegla;

    @Column(name = "DESCRIPCION", length = 500)
    private String descripcion;

    /** Expresión SpEL para evaluación dinámica del motor RF-14 */
    @Column(name = "EXPRESION_SPEL", length = 1000)
    private String expresionSpel;

    /** Valor paramétrico: puntaje máximo, porcentaje, etc. */
    @Column(name = "VALOR_PARAMETRO", length = 200)
    private String valorParametro;

    /** CURRICULAR | TECNICA | ENTREVISTA — CHECK TBL_RM_CK_ETAPA */
    @Column(name = "ETAPA_EVALUACION", length = 20)
    private String etapaEvaluacion;

    /** Peso ponderado (BigDecimal para precisión) */
    @Column(name = "PESO", precision = 5, scale = 2)
    private BigDecimal peso;

    /** Umbral mínimo para aprobar la etapa */
    @Column(name = "UMBRAL_MINIMO", precision = 5, scale = 2)
    private BigDecimal umbralMinimo;

    /** Orden de aplicación — reglas CALCULO primero (1-3), FILTRO después (10+) */
    @Column(name = "PRIORIDAD")
    private Integer prioridad;

    @Column(name = "ACTIVO", nullable = false)
    @Builder.Default
    private Boolean activo = true;

    // ── Auditoría ──

    @Column(name = "USUARIO_CREACION", nullable = false, length = 50)
    private String usuarioCreacion;

    @Column(name = "FECHA_CREACION", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
    }
}
