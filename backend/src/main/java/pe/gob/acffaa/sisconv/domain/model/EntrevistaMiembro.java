package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * TBL_ENTREVISTA_MIEMBRO — DDL_NEW.sql (6 columnas)
 * UK_ENTREV_MIEMB(ID_ENTREVISTA, ID_MIEMBRO_COMITE)
 * SEQ_ENTREVISTA_MIEMB
 */
@Entity
@Table(name = "TBL_ENTREVISTA_MIEMBRO",
       uniqueConstraints = @UniqueConstraint(name = "UK_ENTREV_MIEMB",
           columnNames = {"ID_ENTREVISTA", "ID_MIEMBRO_COMITE"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EntrevistaMiembro {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_ent_miembro")
    @SequenceGenerator(name = "seq_ent_miembro", sequenceName = "SEQ_ENTREVISTA_MIEMB", allocationSize = 1)
    @Column(name = "ID_ENTREVISTA_MIEMBRO")
    private Long idEntrevistaMiembro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_ENTREVISTA", nullable = false)
    private EntrevistaPersonal entrevista;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_MIEMBRO_COMITE", nullable = false)
    private MiembroComite miembro;

    @Column(name = "PUNTAJE_INDIVIDUAL", precision = 5, scale = 2)
    private BigDecimal puntajeIndividual;

    @Column(name = "OBSERVACION", length = 500)
    private String observacion;

    @Column(name = "FECHA_REGISTRO", updatable = false)
    private LocalDateTime fechaRegistro;

    @PrePersist
    protected void onCreate() { this.fechaRegistro = LocalDateTime.now(); }
}
