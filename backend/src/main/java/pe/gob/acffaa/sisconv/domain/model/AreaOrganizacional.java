package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * TBL_AREA_ORGANIZACIONAL — Estructura orgánica de la ACFFAA
 * AF §7.2 Nivel 0: Catálogos Paramétricos
 * Self-reference: ID_AREA_PADRE para jerarquía organizacional
 */
@Entity
@Table(name = "TBL_AREA_ORGANIZACIONAL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AreaOrganizacional {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_area")
    @SequenceGenerator(name = "seq_area", sequenceName = "SEQ_AREA", allocationSize = 1)
    @Column(name = "ID_AREA")
    private Long idArea;

    @Column(name = "CODIGO_AREA", nullable = false, unique = true, length = 20)
    private String codigoArea;

    @Column(name = "NOMBRE_AREA", nullable = false, length = 200)
    private String nombreArea;

    @Column(name = "SIGLA", length = 20)
    private String sigla;

    @Column(name = "TIPO_AREA", length = 50)
    private String tipoArea;

    @Column(name = "ID_AREA_PADRE")
    private Long idAreaPadre;

    @Column(name = "RESPONSABLE", length = 200)
    private String responsable;

    @Column(name = "ESTADO", nullable = false, length = 20)
    @Builder.Default
    private String estado = "ACTIVO";
}
