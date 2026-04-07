package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Banco de preguntas del examen técnico virtual — V34.
 * Tabla: TBL_BANCO_PREGUNTA.
 * Cargado por AREA_SOLICITANTE. ORH NO accede al contenido (solo metadatos).
 * FK: TBL_CONVOCATORIA.
 */
@Entity
@Table(name = "TBL_BANCO_PREGUNTA",
       uniqueConstraints = @UniqueConstraint(name = "UK_PREGUNTA_CONV_NUM",
           columnNames = {"ID_CONVOCATORIA", "NUMERO_PREGUNTA"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BancoPregunta {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_banco_pregunta")
    @SequenceGenerator(name = "seq_banco_pregunta", sequenceName = "SEQ_BANCO_PREGUNTA", allocationSize = 1)
    @Column(name = "ID_PREGUNTA")
    private Long idPregunta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA", nullable = false)
    private Convocatoria convocatoria;

    @Column(name = "NUMERO_PREGUNTA", nullable = false)
    private Integer numeroPregunta;

    @Column(name = "ENUNCIADO", nullable = false, length = 2000)
    private String enunciado;

    @Column(name = "OPCION_A", nullable = false, length = 500)
    private String opcionA;

    @Column(name = "OPCION_B", nullable = false, length = 500)
    private String opcionB;

    @Column(name = "OPCION_C", nullable = false, length = 500)
    private String opcionC;

    @Column(name = "OPCION_D", nullable = false, length = 500)
    private String opcionD;

    /** A, B, C o D */
    @Column(name = "RESPUESTA_CORRECTA", nullable = false, length = 1)
    private String respuestaCorrecta;

    @Column(name = "PUNTAJE", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal puntaje = new BigDecimal("1.00");

    @Column(name = "ESTADO", nullable = false, length = 20)
    @Builder.Default
    private String estado = "ACTIVO";

    @Column(name = "USUARIO_CREACION", length = 50)
    private String usuarioCreacion;

    @Column(name = "FECHA_CREACION", updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() { this.fechaCreacion = LocalDateTime.now(); }
}
