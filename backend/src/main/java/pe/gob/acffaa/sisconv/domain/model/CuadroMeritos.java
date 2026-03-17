package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * TBL_CUADRO_MERITOS — DDL_NEW.sql (12 columnas)
 * CK_CUADRO_RESULTADO: GANADOR, ACCESITARIO, NO_SELECCIONADO
 * UK_CUADRO_CONV_POST(ID_CONVOCATORIA, ID_POSTULACION)
 */
@Entity
@Table(name = "TBL_CUADRO_MERITOS",
       uniqueConstraints = @UniqueConstraint(name = "UK_CUADRO_CONV_POST",
           columnNames = {"ID_CONVOCATORIA", "ID_POSTULACION"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CuadroMeritos {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_merito")
    @SequenceGenerator(name = "seq_merito", sequenceName = "SEQ_CUADRO_MERITOS", allocationSize = 1)
    @Column(name = "ID_CUADRO_MERITOS")
    private Long idCuadroMeritos;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA", nullable = false)
    private Convocatoria convocatoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULACION", nullable = false)
    private Postulacion postulacion;

    @Column(name = "PUNTAJE_CURRICULAR", precision = 5, scale = 2)
    private BigDecimal puntajeCurricular;

    @Column(name = "PUNTAJE_TECNICA", precision = 5, scale = 2)
    private BigDecimal puntajeTecnica;

    @Column(name = "PUNTAJE_ENTREVISTA", precision = 5, scale = 2)
    private BigDecimal puntajeEntrevista;

    @Column(name = "PUNTAJE_BONIFICACION", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal puntajeBonificacion = BigDecimal.ZERO;

    @Column(name = "PUNTAJE_TOTAL", precision = 5, scale = 2)
    private BigDecimal puntajeTotal;

    @Column(name = "ORDEN_MERITO")
    private Integer ordenMerito;

    @Column(name = "RESULTADO", length = 20)
    private String resultado;

    @Column(name = "FECHA_CALCULO", updatable = false)
    private LocalDateTime fechaCalculo;

    @Column(name = "USUARIO_CREACION", length = 50, updatable = false)
    private String usuarioCreacion;

    @PrePersist
    protected void onCreate() { this.fechaCalculo = LocalDateTime.now(); }
}
