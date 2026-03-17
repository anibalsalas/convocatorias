package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "TBL_PERFIL_FORMACION_ACADEMICA")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerfilFormacionAcademica {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_perfil_formacion")
    @SequenceGenerator(name = "seq_perfil_formacion", sequenceName = "SEQ_PERFIL_FORMACION_ACA", allocationSize = 1)
    @Column(name = "ID_PERFIL_FORMACION")
    private Long idPerfilFormacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_PERFIL_PUESTO", nullable = false)
    private PerfilPuesto perfilPuesto;

    @Column(name = "GRADO_ACADEMICO", nullable = false, length = 100)
    private String gradoAcademico;

    @Column(name = "ESPECIALIDAD", nullable = false, length = 200)
    private String especialidad;

    @Column(name = "REQUIERE_COLEGIATURA", nullable = false)
    @Builder.Default
    private Boolean requiereColegiatura = Boolean.FALSE;

    @Column(name = "REQUIERE_HABILITACION_PROF", nullable = false)
    @Builder.Default
    private Boolean requiereHabilitacionProfesional = Boolean.FALSE;

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
