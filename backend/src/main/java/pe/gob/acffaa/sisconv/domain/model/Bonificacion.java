package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * TBL_BONIFICACION — DDL_NEW.sql (9 columnas)
 * CK_BONIF_TIPO: FFAA, DISCAPACIDAD, DEPORTISTA
 * UK_BONIF_POST_TIPO(ID_POSTULACION, TIPO_BONIFICACION)
 */
@Entity
@Table(name = "TBL_BONIFICACION",
       uniqueConstraints = @UniqueConstraint(name = "UK_BONIF_POST_TIPO",
           columnNames = {"ID_POSTULACION", "TIPO_BONIFICACION"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Bonificacion {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_bonif")
    @SequenceGenerator(name = "seq_bonif", sequenceName = "SEQ_BONIFICACION", allocationSize = 1)
    @Column(name = "ID_BONIFICACION")
    private Long idBonificacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULACION", nullable = false)
    private Postulacion postulacion;

    @Column(name = "TIPO_BONIFICACION", nullable = false, length = 20)
    private String tipoBonificacion;

    @Column(name = "PORCENTAJE", precision = 5, scale = 2)
    private BigDecimal porcentaje;

    @Column(name = "PUNTAJE_BASE", precision = 5, scale = 2)
    private BigDecimal puntajeBase;

    @Column(name = "PUNTAJE_APLICADO", precision = 5, scale = 2)
    private BigDecimal puntajeAplicado;

    @Column(name = "BASE_LEGAL", length = 200)
    private String baseLegal;

    @Column(name = "FECHA_APLICACION", updatable = false)
    private LocalDateTime fechaAplicacion;

    @Column(name = "USUARIO_CREACION", length = 50, updatable = false)
    private String usuarioCreacion;

    @PrePersist
    protected void onCreate() { this.fechaAplicacion = LocalDateTime.now(); }
}
