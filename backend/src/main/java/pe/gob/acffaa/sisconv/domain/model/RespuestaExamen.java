package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Respuesta individual del postulante a una pregunta — V34.
 * Tabla: TBL_RESPUESTA_EXAMEN.
 * UK: (ID_EXAMEN_POSTULANTE, ID_PREGUNTA).
 * Inmutable post-calificación (trazabilidad D.L. 1451).
 */
@Entity
@Table(name = "TBL_RESPUESTA_EXAMEN",
       uniqueConstraints = @UniqueConstraint(name = "UK_RESP_EXAMEN_PREGUNTA",
           columnNames = {"ID_EXAMEN_POSTULANTE", "ID_PREGUNTA"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RespuestaExamen {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_respuesta_examen")
    @SequenceGenerator(name = "seq_respuesta_examen", sequenceName = "SEQ_RESPUESTA_EXAMEN", allocationSize = 1)
    @Column(name = "ID_RESPUESTA")
    private Long idRespuesta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_EXAMEN_POSTULANTE", nullable = false)
    private ExamenPostulante examenPostulante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_PREGUNTA", nullable = false)
    private BancoPregunta pregunta;

    /** A, B, C, D o NULL si no respondió */
    @Column(name = "RESPUESTA_MARCADA", length = 1)
    private String respuestaMarcada;

    @Column(name = "ES_CORRECTA")
    private Boolean esCorrecta;

    @Column(name = "PUNTAJE_OBTENIDO", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal puntajeObtenido = BigDecimal.ZERO;

    /** Orden aleatorio en que se mostró esta pregunta al postulante */
    @Column(name = "ORDEN_MOSTRADO")
    private Integer ordenMostrado;

    @Column(name = "FECHA_RESPUESTA")
    private LocalDateTime fechaRespuesta;
}
