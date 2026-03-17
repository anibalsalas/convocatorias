package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * TBL_DECLARACION_JURADA — DDL_NEW.sql (6 columnas)
 * CK_DECL_TIPO: VERACIDAD, ANTECEDENTES, NEPOTISMO, INCOMPATIBILIDAD, SALUD
 * SEQ_DECLARACION
 */
@Entity
@Table(name = "TBL_DECLARACION_JURADA")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DeclaracionJurada {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_ddjj")
    @SequenceGenerator(name = "seq_ddjj", sequenceName = "SEQ_DECLARACION", allocationSize = 1)
    @Column(name = "ID_DECLARACION")
    private Long idDeclaracion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULACION", nullable = false)
    private Postulacion postulacion;

    @Column(name = "TIPO_DECLARACION", nullable = false, length = 30)
    private String tipoDeclaracion;

    @Column(name = "ACEPTADA", nullable = false)
    @Builder.Default
    private Boolean aceptada = false;

    @Column(name = "FECHA_ACEPTACION")
    private LocalDateTime fechaAceptacion;

    @Column(name = "IP_ACEPTACION", length = 45)
    private String ipAceptacion;
}
