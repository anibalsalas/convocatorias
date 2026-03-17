package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "TBL_PERFIL_EXPERIENCIA")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerfilExperiencia {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_perfil_experiencia")
    @SequenceGenerator(name = "seq_perfil_experiencia", sequenceName = "SEQ_PERFIL_EXPERIENCIA", allocationSize = 1)
    @Column(name = "ID_PERFIL_EXPERIENCIA")
    private Long idPerfilExperiencia;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_PERFIL_PUESTO", nullable = false)
    private PerfilPuesto perfilPuesto;

    @Column(name = "TIPO_EXPERIENCIA", nullable = false, length = 30)
    private String tipoExperiencia;

    @Column(name = "CANTIDAD", nullable = false)
    private Integer cantidad;

    @Column(name = "UNIDAD_TIEMPO", nullable = false, length = 10)
    private String unidadTiempo;

    @Column(name = "NIVEL_MINIMO_PUESTO", nullable = false, length = 120)
    private String nivelMinimoPuesto;

    @Column(name = "DETALLE", nullable = false, length = 1000)
    private String detalle;

    @Column(name = "ORDEN", nullable = false)
    @Builder.Default
    private Integer orden = 0;

    @Column(name = "DELETED_AT")
    private LocalDateTime deletedAt;

    @Version
    @Column(name = "VERSION", nullable = false)
    private Long version;

    @PrePersist
    protected void onCreate() {
        if (this.version == null) {
            this.version = 0L;
        }
    }
}
