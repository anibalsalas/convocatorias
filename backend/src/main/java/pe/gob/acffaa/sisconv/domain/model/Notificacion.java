package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Notificación del sistema — Transversal RF-17 (D.S. 075-2008-PCM).
 * Tabla: TBL_NOTIFICACION.
 * Coherente con DLL actual.
 */
@Entity
@Table(name = "TBL_NOTIFICACION")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_notificacion")
    @SequenceGenerator(name = "seq_notificacion", sequenceName = "SEQ_NOTIFICACION", allocationSize = 1)
    @Column(name = "ID_NOTIFICACION")
    private Long idNotificacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA")
    private Convocatoria convocatoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_USUARIO_DESTINO", nullable = false)
    private Usuario usuarioDestino;

    @Column(name = "TIPO_NOTIFICACION", nullable = false, length = 30)
    private String tipoNotificacion;

    @Column(name = "TITULO", length = 200)
    private String titulo;

    @Column(name = "MENSAJE", length = 2000)
    private String mensaje;

    @Column(name = "CANAL", nullable = false, length = 20)
    @Builder.Default
    private String canal = "SISTEMA";

    @Column(name = "LEIDA", nullable = false)
    @Builder.Default
    private Boolean leida = false;

    @Column(name = "FECHA_LECTURA")
    private LocalDateTime fechaLectura;

    @Column(name = "ESTADO", nullable = false, length = 20)
    @Builder.Default
    private String estado = "ENVIADA";

    @Column(name = "FECHA_ENVIO", nullable = false)
    private LocalDateTime fechaEnvio;

    @Column(name = "USUARIO_CREACION", length = 50)
    private String usuarioCreacion;

    @Column(name = "DELETED_AT")
    private LocalDateTime deletedAt;

    @Version
    @Column(name = "VERSION", nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(name = "FECHA_CREACION")
    private LocalDateTime fechaCreacion;

    @Column(name = "EMAIL_DESTINO", length = 200)
    private String emailDestino;

    @Column(name = "CONTENIDO", length = 2000)
    private String contenido;

    @Column(name = "ASUNTO", length = 200)
    private String asunto;

    @PrePersist
    public void prePersist() {
        LocalDateTime ahora = LocalDateTime.now();

        if (this.tipoNotificacion == null || this.tipoNotificacion.isBlank()) {
            this.tipoNotificacion = "SISTEMA";
        }
        if (this.canal == null || this.canal.isBlank()) {
            this.canal = "SISTEMA";
        }
        if (this.estado == null || this.estado.isBlank()) {
            this.estado = "ENVIADA";
        }
        if (this.leida == null) {
            this.leida = false;
        }
        if (this.fechaEnvio == null) {
            this.fechaEnvio = ahora;
        }
        if (this.fechaCreacion == null) {
            this.fechaCreacion = ahora;
        }
        if (this.version == null) {
            this.version = 0L;
        }

        if ((this.titulo == null || this.titulo.isBlank()) && this.asunto != null) {
            this.titulo = this.asunto;
        }
        if ((this.asunto == null || this.asunto.isBlank()) && this.titulo != null) {
            this.asunto = this.titulo;
        }

        if ((this.mensaje == null || this.mensaje.isBlank()) && this.contenido != null) {
            this.mensaje = this.contenido;
        }
        if ((this.contenido == null || this.contenido.isBlank()) && this.mensaje != null) {
            this.contenido = this.mensaje;
        }
    }
}