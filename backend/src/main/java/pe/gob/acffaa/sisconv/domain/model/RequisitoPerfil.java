package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Requisitos específicos del perfil: formación, conocimientos, cursos, certificaciones.
 * Tabla: TBL_REQUISITO_PERFIL (V4 PKG-01). Hijo de TBL_PERFIL_PUESTO (ON DELETE CASCADE).
 * FK catálogo: ID_TIPO_REQUISITO → TBL_CATALOGO_DETALLE (TIPO_REQUISITO).
 */
@Entity
@Table(name = "TBL_REQUISITO_PERFIL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RequisitoPerfil {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_requisito_perfil")
    @SequenceGenerator(name = "seq_requisito_perfil", sequenceName = "SEQ_REQUISITO_PERFIL", allocationSize = 1)
    @Column(name = "ID_REQUISITO_PERFIL")
    private Long idRequisitoPerfil;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_PERFIL_PUESTO", nullable = false)
    private PerfilPuesto perfilPuesto;

    /** FK → TBL_CATALOGO_DETALLE (catálogo TIPO_REQUISITO) */
    @Column(name = "ID_TIPO_REQUISITO", nullable = false)
    private Long idTipoRequisito;

    @Column(name = "DESCRIPCION", nullable = false, length = 500)
    private String descripcion;

    /** S=Obligatorio, N=Deseable */
    @Column(name = "ES_OBLIGATORIO", nullable = false, length = 1)
    @Builder.Default
    private String esObligatorio = "S";

    @Column(name = "ORDEN")
    @Builder.Default
    private Integer orden = 0;
}
