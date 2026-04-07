package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Instancia de examen rendido por un postulante — V34.
 * Tabla: TBL_EXAMEN_POSTULANTE.
 * UK: (ID_CONFIG_EXAMEN, ID_POSTULACION) — un examen por postulante por convocatoria.
 * Estados: PENDIENTE → EN_CURSO → FINALIZADO | EXPIRADO.
 */
@Entity
@Table(name = "TBL_EXAMEN_POSTULANTE",
       uniqueConstraints = @UniqueConstraint(name = "UK_EXAMEN_POSTULACION",
           columnNames = {"ID_CONFIG_EXAMEN", "ID_POSTULACION"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExamenPostulante {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_examen_postulante")
    @SequenceGenerator(name = "seq_examen_postulante", sequenceName = "SEQ_EXAMEN_POSTULANTE", allocationSize = 1)
    @Column(name = "ID_EXAMEN_POSTULANTE")
    private Long idExamenPostulante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONFIG_EXAMEN", nullable = false)
    private ConfigExamen configExamen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULACION", nullable = false)
    private Postulacion postulacion;

    @Column(name = "HORA_INICIO")
    private LocalDateTime horaInicio;

    @Column(name = "HORA_FIN")
    private LocalDateTime horaFin;

    @Column(name = "PUNTAJE_TOTAL", precision = 5, scale = 2)
    private BigDecimal puntajeTotal;

    @Column(name = "TOTAL_CORRECTAS")
    private Integer totalCorrectas;

    @Column(name = "TOTAL_PREGUNTAS")
    private Integer totalPreguntas;

    /** PENDIENTE, EN_CURSO, FINALIZADO, EXPIRADO */
    @Column(name = "ESTADO", nullable = false, length = 20)
    @Builder.Default
    private String estado = "PENDIENTE";

    @Column(name = "IP_ACCESO", length = 50)
    private String ipAcceso;

    @Column(name = "USER_AGENT", length = 500)
    private String userAgent;

    @Column(name = "FECHA_CREACION", updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() { this.fechaCreacion = LocalDateTime.now(); }
}
