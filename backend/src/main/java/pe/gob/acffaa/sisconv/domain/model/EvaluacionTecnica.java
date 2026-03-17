package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * TBL_EVALUACION_TECNICA — DDL_NEW.sql (8 columnas)
 * UK_EVAL_TEC(ID_POSTULACION, ID_FACTOR)
 * FK: ID_FACTOR → TBL_FACTOR_EVALUACION, ID_EVALUADOR → TBL_USUARIO
 */
@Entity
@Table(name = "TBL_EVALUACION_TECNICA",
       uniqueConstraints = @UniqueConstraint(name = "UK_EVAL_TEC",
           columnNames = {"ID_POSTULACION", "ID_FACTOR"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EvaluacionTecnica {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_eval_tec")
    @SequenceGenerator(name = "seq_eval_tec", sequenceName = "SEQ_EVAL_TECNICA", allocationSize = 1)
    @Column(name = "ID_EVAL_TECNICA")
    private Long idEvalTecnica;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULACION", nullable = false)
    private Postulacion postulacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_FACTOR") // FIX #4: DDL permite NULL (factor puede no existir en etapa TECNICA)
    private FactorEvaluacion factor;

    @Column(name = "CODIGO_ANONIMO", nullable = false, length = 20)
    private String codigoAnonimo;

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
