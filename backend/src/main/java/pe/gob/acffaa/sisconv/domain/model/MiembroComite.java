package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Miembro del Comité de Selección — CU-07, E11.
 * Tabla: TBL_MIEMBRO_COMITE.
 *
 * FK: TBL_COMITE_SELECCION, TBL_USUARIO.
 * Constraint: CK_MIEMBRO_ROL (PRESIDENTE|SECRETARIO|VOCAL)
 *
 * Coherencia: DLL_03.sql líneas 612-622
 */
@Entity
@Table(name = "TBL_MIEMBRO_COMITE")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MiembroComite {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_miembro_comite")
    @SequenceGenerator(name = "seq_miembro_comite", sequenceName = "SEQ_MIEMBRO_COMITE", allocationSize = 1)
    @Column(name = "ID_MIEMBRO_COMITE")
    private Long idMiembroComite;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_COMITE", nullable = false)
    private ComiteSeleccion comite;

    @Column(name = "ID_USUARIO")
    private Long idUsuario;

    @Column(name = "NOMBRES_COMPLETOS", length = 200)
    private String nombresCompletos;

    @Column(name = "CARGO", length = 200)
    private String cargo;

    /** PRESIDENTE, SECRETARIO, VOCAL */
    @Column(name = "ROL_COMITE", nullable = false, length = 20)
    private String rolComite;

    @Column(name = "ES_TITULAR")
    @Builder.Default
    private Boolean esTitular = true;

    @Column(name = "ESTADO", length = 20)
    @Builder.Default
    private String estado = "ACTIVO";

    @Column(name = "FECHA_CREACION", updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
    }
}
