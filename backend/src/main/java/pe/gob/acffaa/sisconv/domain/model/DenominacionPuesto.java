package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Catálogo de denominaciones de puesto (Ley Servicio Civil Art. 3).
 * Tabla: TBL_DENOMINACION_PUESTO.
 */
@Entity
@Table(name = "TBL_DENOMINACION_PUESTO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DenominacionPuesto {

    @Id
    @Column(name = "ID_DENOMINACION_PUESTO")
    private Long idDenominacionPuesto;

    @Column(name = "CODIGO", nullable = false, length = 50)
    private String codigo;

    @Column(name = "DESCRIPCION", nullable = false, length = 500)
    private String descripcion;

    @Column(name = "ORDEN")
    @Builder.Default
    private Integer orden = 0;
}
