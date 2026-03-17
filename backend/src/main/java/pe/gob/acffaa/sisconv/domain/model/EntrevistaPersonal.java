package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * TBL_ENTREVISTA_PERSONAL — DDL_NEW.sql (12 columnas)
 * CK_ENTREV_MODALIDAD: PRESENCIAL, VIRTUAL, HIBRIDA
 * UK_ENTREV_POST(ID_POSTULACION)
 * SEQ_ENTREVISTA
 */
@Entity
@Table(name = "TBL_ENTREVISTA_PERSONAL",
       uniqueConstraints = @UniqueConstraint(name = "UK_ENTREV_POST",
           columnNames = {"ID_POSTULACION"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EntrevistaPersonal {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_entrevista")
    @SequenceGenerator(name = "seq_entrevista", sequenceName = "SEQ_ENTREVISTA", allocationSize = 1)
    @Column(name = "ID_ENTREVISTA")
    private Long idEntrevista;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULACION", nullable = false)
    private Postulacion postulacion;

    @Column(name = "FECHA_ENTREVISTA")
    private LocalDateTime fechaEntrevista;

    @Column(name = "LUGAR", length = 200)
    private String lugar;

    @Column(name = "MODALIDAD", length = 20)
    @Builder.Default
    private String modalidad = "PRESENCIAL";

    @Column(name = "MIEMBROS_PRESENTES")
    private Integer miembrosPresentes;

    @Column(name = "QUORUM_ALCANZADO")
    @Builder.Default
    private Boolean quorumAlcanzado = true;

    @Column(name = "PUNTAJE_PROMEDIO", precision = 5, scale = 2)
    private BigDecimal puntajePromedio;

    @Column(name = "OBSERVACIONES", length = 1000)
    private String observaciones;

    @Column(name = "ESTADO", length = 20)
    @Builder.Default
    private String estado = "REALIZADA";

    @Column(name = "FECHA_CREACION", updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "USUARIO_CREACION", length = 50, updatable = false)
    private String usuarioCreacion;

    @PrePersist
    protected void onCreate() { this.fechaCreacion = LocalDateTime.now(); }
}
