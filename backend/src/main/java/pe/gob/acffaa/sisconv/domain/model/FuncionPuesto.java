package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Funciones principales del puesto CAS según TDR.
 * Tabla: TBL_FUNCION_PUESTO (V4 PKG-01). Hijo de TBL_PERFIL_PUESTO (ON DELETE CASCADE).
 */
@Entity
@Table(name = "TBL_FUNCION_PUESTO")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FuncionPuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_funcion_puesto")
    @SequenceGenerator(name = "seq_funcion_puesto", sequenceName = "SEQ_FUNCION_PUESTO", allocationSize = 1)
    @Column(name = "ID_FUNCION_PUESTO")
    private Long idFuncionPuesto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_PERFIL_PUESTO", nullable = false)
    private PerfilPuesto perfilPuesto;

    @Column(name = "DESCRIPCION_FUNCION", nullable = false, length = 500)
    private String descripcionFuncion;

    @Column(name = "ORDEN")
    @Builder.Default
    private Integer orden = 0;
}
