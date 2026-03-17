package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "TBL_POSTULANTE_DOCUMENTO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostulanteDocumento {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_postulante_documento")
    @SequenceGenerator(
            name = "seq_postulante_documento",
            sequenceName = "SEQ_POSTULANTE_DOCUMENTO",
            allocationSize = 1
    )
    @Column(name = "ID_DOCUMENTO")
    private Long idDocumento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULANTE", nullable = false)
    private Postulante postulante;

    @Column(name = "TIPO_DOCUMENTO", nullable = false, length = 150)
    private String tipoDocumento;

    @Column(name = "NOMBRE_ARCHIVO", nullable = false, length = 300)
    private String nombreArchivo;

    @Column(name = "EXTENSION", nullable = false, length = 10)
    @Builder.Default
    private String extension = "pdf";

    @Column(name = "TAMANO_KB")
    private Long tamanoKb;

    @Column(name = "HASH_SHA256", length = 64)
    private String hashSha256;

    @Column(name = "RUTA_ARCHIVO", length = 500)
    private String rutaArchivo;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "ARCHIVO_PDF")
    private byte[] archivoPdf;

    @Column(name = "ESTADO", nullable = false, length = 20)
    @Builder.Default
    private String estado = "ACTIVO";

    @Column(name = "FECHA_CREACION", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "USUARIO_CREACION", nullable = false, updatable = false, length = 50)
    private String usuarioCreacion;

    @Column(name = "FECHA_MODIFICACION")
    private LocalDateTime fechaModificacion;

    @Column(name = "USUARIO_MODIFICACION", length = 50)
    private String usuarioModificacion;

    @Column(name = "DELETED_AT")
    private LocalDateTime deletedAt;

    @Version
    @Column(name = "VERSION", nullable = false)
    private Long version;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
        if (this.version == null) {
            this.version = 0L;
        }
        if (this.estado == null || this.estado.isBlank()) {
            this.estado = "ACTIVO";
        }
        if (this.extension == null || this.extension.isBlank()) {
            this.extension = "pdf";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.fechaModificacion = LocalDateTime.now();
    }
}