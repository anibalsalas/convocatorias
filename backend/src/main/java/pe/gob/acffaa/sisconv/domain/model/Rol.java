package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * TBL_ROL — Roles del sistema SISCONV
 * AF §7.2 Nivel 1 | SAD §5.2 RBAC: ADMIN, ORH, OPP, AREA_SOLICITANTE, COMITE, POSTULANTE
 */
@Entity
@Table(name = "TBL_ROL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Rol {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_rol")
    @SequenceGenerator(name = "seq_rol", sequenceName = "SEQ_ROL", allocationSize = 1)
    @Column(name = "ID_ROL")
    private Long idRol;

    @Column(name = "CODIGO_ROL", nullable = false, unique = true, length = 30)
    private String codigoRol;

    @Column(name = "NOMBRE_ROL", nullable = false, length = 100)
    private String nombreRol;

    @Column(name = "DESCRIPCION", length = 500)
    private String descripcion;

    @Column(name = "ESTADO", nullable = false, length = 20)
    @Builder.Default
    private String estado = "ACTIVO";
}
