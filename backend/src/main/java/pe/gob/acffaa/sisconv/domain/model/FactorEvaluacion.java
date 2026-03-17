package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.ArrayList;
import java.util.List;

/**
 * Factor de Evaluación — CU-08, E12.
 * Tabla: TBL_FACTOR_EVALUACION.
 *
 * FK: TBL_CONVOCATORIA.
 * Constraints: CK_FACTOR_ETAPA (CURRICULAR|TECNICA|ENTREVISTA),
 *              CK_FACTOR_PUNTAJE (PUNTAJE_MAXIMO >= PUNTAJE_MINIMO)
 *
 * Coherencia: DLL_03.sql líneas 552-564
 */
@Entity
@Table(name = "TBL_FACTOR_EVALUACION")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FactorEvaluacion {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_factor_eval")
    @SequenceGenerator(name = "seq_factor_eval", sequenceName = "SEQ_FACTOR_EVAL", allocationSize = 1)
    @Column(name = "ID_FACTOR")
    private Long idFactor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA", nullable = false)
    private Convocatoria convocatoria;

    /** Self-reference: NULL = fase principal, NOT NULL = subcriterio */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_FACTOR_PADRE")
    private FactorEvaluacion factorPadre;

    @OneToMany(mappedBy = "factorPadre", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<FactorEvaluacion> subcriterios = new ArrayList<>();

    /** CURRICULAR, TECNICA, ENTREVISTA */
    @Column(name = "ETAPA_EVALUACION", nullable = false, length = 20)
    private String etapaEvaluacion;

    @Column(name = "CRITERIO", nullable = false, length = 200)
    private String criterio;

    @Column(name = "PUNTAJE_MAXIMO", precision = 5, scale = 2)
    private BigDecimal puntajeMaximo;

    @Column(name = "PUNTAJE_MINIMO", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal puntajeMinimo = BigDecimal.ZERO;

    @Column(name = "PESO_CRITERIO", precision = 5, scale = 2)
    private BigDecimal pesoCriterio;

    @Column(name = "ORDEN")
    private Integer orden;

    @Column(name = "DESCRIPCION", length = 500)
    private String descripcion;

    @Column(name = "ESTADO", length = 20)
    @Builder.Default
    private String estado = "ACTIVO";

    @Column(name = "FECHA_CREACION", updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "USUARIO_CREACION", length = 50)
    private String usuarioCreacion;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
    }
}
