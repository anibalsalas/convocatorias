package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * TBL_EXPEDIENTE_VIRTUAL — DDL_NEW.sql (13 columnas)
 * CK_EXPED_ESTADO: CARGADO, VERIFICADO, RECHAZADO
 * SEQ_EXPEDIENTE
 */
@Entity
@Table(name = "TBL_EXPEDIENTE_VIRTUAL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExpedienteVirtual {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_expediente")
    @SequenceGenerator(name = "seq_expediente", sequenceName = "SEQ_EXPEDIENTE", allocationSize = 1)
    @Column(name = "ID_EXPEDIENTE")
    private Long idExpediente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULACION", nullable = false)
    private Postulacion postulacion;

    @Column(name = "TIPO_DOCUMENTO", nullable = false, length = 50)
    private String tipoDocumento;

    @Column(name = "NOMBRE_ARCHIVO", nullable = false, length = 300)
    private String nombreArchivo;

    @Column(name = "RUTA_ARCHIVO", length = 500)
    private String rutaArchivo;

    @Column(name = "EXTENSION", length = 10)
    private String extension;

    @Column(name = "TAMANO_KB")
    private Long tamanoKb;

    @Column(name = "HASH_SHA256", length = 64)
    private String hashSha256;

    @Column(name = "VERIFICADO")
    @Builder.Default
    private Boolean verificado = false;

    @Column(name = "FECHA_VERIFICACION")
    private LocalDateTime fechaVerificacion;

    @Column(name = "ESTADO", length = 20)
    @Builder.Default
    private String estado = "CARGADO";

    @Column(name = "FECHA_CARGA", updatable = false)
    private LocalDateTime fechaCarga;

    @Column(name = "USUARIO_CREACION", length = 50, updatable = false)
    private String usuarioCreacion;

    @PrePersist
    protected void onCreate() { this.fechaCarga = LocalDateTime.now(); }
}
