package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Comité de Selección CAS — CU-07, E11.
 * Tabla: TBL_COMITE_SELECCION.
 *
 * FK: TBL_CONVOCATORIA. Hijos: TBL_MIEMBRO_COMITE.
 *
 * Coherencia: DLL_03.sql líneas 306-316
 */
@Entity
@Table(name = "TBL_COMITE_SELECCION")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComiteSeleccion {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_comite")
    @SequenceGenerator(name = "seq_comite", sequenceName = "SEQ_COMITE", allocationSize = 1)
    @Column(name = "ID_COMITE")
    private Long idComite;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA", nullable = false)
    private Convocatoria convocatoria;

    @Column(name = "NUMERO_RESOLUCION", length = 50)
    private String numeroResolucion;

    @Column(name = "FECHA_DESIGNACION")
    private LocalDate fechaDesignacion;

    @Column(name = "ESTADO", length = 20)
    @Builder.Default
    private String estado = "ACTIVO";

    @Column(name = "FECHA_CREACION", updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "USUARIO_CREACION", length = 50)
    private String usuarioCreacion;

    @OneToMany(mappedBy = "comite", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MiembroComite> miembros = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
    }
}
