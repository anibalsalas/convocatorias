package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Configuración del examen técnico virtual — V34.
 * Tabla: TBL_CONFIG_EXAMEN.
 * Administrado por ORH (sin acceso al contenido del banco).
 * FK: TBL_CONVOCATORIA (UK 1:1).
 * Estados: CONFIGURADO → PUBLICADO → CERRADO.
 */
@Entity
@Table(name = "TBL_CONFIG_EXAMEN",
       uniqueConstraints = @UniqueConstraint(name = "UK_CONFIG_CONV",
           columnNames = {"ID_CONVOCATORIA"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConfigExamen {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_config_examen")
    @SequenceGenerator(name = "seq_config_examen", sequenceName = "SEQ_CONFIG_EXAMEN", allocationSize = 1)
    @Column(name = "ID_CONFIG_EXAMEN")
    private Long idConfigExamen;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA", nullable = false)
    private Convocatoria convocatoria;

    @Column(name = "CANTIDAD_PREGUNTAS", nullable = false)
    @Builder.Default
    private Integer cantidadPreguntas = 10;

    @Column(name = "FECHA_HORA_INICIO", nullable = false)
    private LocalDateTime fechaHoraInicio;

    @Column(name = "FECHA_HORA_FIN", nullable = false)
    private LocalDateTime fechaHoraFin;

    @Column(name = "DURACION_MINUTOS", nullable = false)
    @Builder.Default
    private Integer duracionMinutos = 60;

    /** Si true, el postulante ve su puntaje al finalizar. ORH ya no lo desactiva (siempre true al guardar). */
    @Column(name = "MOSTRAR_RESULTADO", nullable = false)
    @Builder.Default
    private Boolean mostrarResultado = true;

    /** CONFIGURADO, PUBLICADO, CERRADO */
    @Column(name = "ESTADO", nullable = false, length = 20)
    @Builder.Default
    private String estado = "CONFIGURADO";

    @Column(name = "NOTIFICACION_ENVIADA", nullable = false)
    @Builder.Default
    private Boolean notificacionEnviada = false;

    /** N postulantes APTO al momento de «Notificar examen» (mensaje ORH en E26-V). */
    @Column(name = "CANT_POSTULANTES_NOTIFICADOS")
    private Integer cantPostulantesNotificados;

    @Column(name = "USUARIO_CREACION", length = 50)
    private String usuarioCreacion;

    @Column(name = "FECHA_CREACION", updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "USUARIO_MODIFICACION", length = 50)
    private String usuarioModificacion;

    @Column(name = "FECHA_MODIFICACION")
    private LocalDateTime fechaModificacion;

    @PrePersist
    protected void onCreate() { this.fechaCreacion = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { this.fechaModificacion = LocalDateTime.now(); }
}
