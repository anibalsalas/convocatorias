package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * TBL_EVALUACION_CURRICULAR — DDL_NEW.sql (7 columnas)
 * UK_EVAL_CURR(ID_POSTULACION, ID_FACTOR)
 * FK: ID_EVALUADOR → TBL_USUARIO
 */
@Entity
@Table(name = "TBL_EVALUACION_CURRICULAR",
       uniqueConstraints = @UniqueConstraint(name = "UK_EVAL_CURR",
           columnNames = {"ID_POSTULACION", "ID_FACTOR"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EvaluacionCurricular {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_eval_curr")
    @SequenceGenerator(name = "seq_eval_curr", sequenceName = "SEQ_EVAL_CURRICULAR", allocationSize = 1)
    @Column(name = "ID_EVAL_CURRICULAR")
    private Long idEvalCurricular;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULACION", nullable = false)
    private Postulacion postulacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_FACTOR", nullable = false)
    private FactorEvaluacion factor;

    @Column(name = "PUNTAJE_OBTENIDO", precision = 5, scale = 2)
    private BigDecimal puntajeObtenido;

    @Column(name = "OBSERVACION", length = 500)
    private String observacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_EVALUADOR")
    private Usuario evaluador;

    @Column(name = "FECHA_EVALUACION", updatable = false)
    private LocalDateTime fechaEvaluacion;

    @PrePersist
    protected void onCreate() { this.fechaEvaluacion = LocalDateTime.now(); }
}
