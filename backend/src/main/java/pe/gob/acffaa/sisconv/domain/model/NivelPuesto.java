package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Catálogo de niveles de puesto (rango/escala de responsabilidad).
 * Tabla: TBL_NIVEL_PUESTO.
 */
@Entity
@Table(name = "TBL_NIVEL_PUESTO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NivelPuesto {

    @Id
    @Column(name = "ID_NIVEL_PUESTO")
    private Long idNivelPuesto;

    @Column(name = "CODIGO", nullable = false, length = 50)
    private String codigo;

    @Column(name = "DESCRIPCION", nullable = false, length = 500)
    private String descripcion;

    @Column(name = "ORDEN")
    @Builder.Default
    private Integer orden = 0;
}
