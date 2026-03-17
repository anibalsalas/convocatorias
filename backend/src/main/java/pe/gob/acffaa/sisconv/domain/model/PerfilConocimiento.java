package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "TBL_PERFIL_CONOCIMIENTO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerfilConocimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_perfil_conocimiento")
    @SequenceGenerator(name = "seq_perfil_conocimiento", sequenceName = "SEQ_PERFIL_CONOCIMIENTO", allocationSize = 1)
    @Column(name = "ID_PERFIL_CONOCIMIENTO")
    private Long idPerfilConocimiento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_PERFIL_PUESTO", nullable = false)
    private PerfilPuesto perfilPuesto;

    @Column(name = "TIPO_CONOCIMIENTO", nullable = false, length = 30)
    private String tipoConocimiento;

    @Column(name = "DESCRIPCION", nullable = false, length = 300)
    private String descripcion;

    @Column(name = "HORAS")
    private Integer horas;

    @Column(name = "NIVEL_DOMINIO", nullable = false, length = 30)
    private String nivelDominio;

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
