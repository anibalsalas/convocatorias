package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * TBL_COMUNICADO — DS 083-2019-PCM Art. 10.
 * Comunicados oficiales de aclaración / ampliación de plazo
 * publicados por ORH en cualquier momento del proceso.
 */
@Entity
@Table(name = "TBL_COMUNICADO")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Comunicado {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_comunicado")
    @SequenceGenerator(name = "seq_comunicado", sequenceName = "SEQ_COMUNICADO", allocationSize = 1)
    @Column(name = "ID_COMUNICADO")
    private Long idComunicado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA", nullable = false)
    private Convocatoria convocatoria;

    @Column(name = "TITULO", nullable = false, length = 200)
    private String titulo;

    @Lob
    @Column(name = "DESCRIPCION", nullable = false)
    private String descripcion;

    @Column(name = "FECHA_PUBLICACION", nullable = false, updatable = false)
    private LocalDateTime fechaPublicacion;

    @Column(name = "USUARIO_CREACION", nullable = false, length = 100, updatable = false)
    private String usuarioCreacion;

    @Column(name = "FECHA_CREACION", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        this.fechaPublicacion = LocalDateTime.now();
        this.fechaCreacion = LocalDateTime.now();
    }
}
