package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Cronograma de actividades de la convocatoria CAS — CU-06, E10.
 * Tabla: TBL_CRONOGRAMA.
 *
 * FK: TBL_CONVOCATORIA.
 * Constraints: CK_CRONO_FECHAS (FECHA_FIN >= FECHA_INICIO),
 *              CK_CRONO_ETAPA (PUBLICACION|POSTULACION|EVAL_CURRICULAR|EVAL_TECNICA|ENTREVISTA|RESULTADO|SUSCRIPCION)
 *
 * Coherencia: DLL_03.sql líneas 404-416
 */
@Entity
@Table(name = "TBL_CRONOGRAMA")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Cronograma {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_cronograma")
    @SequenceGenerator(name = "seq_cronograma", sequenceName = "SEQ_CRONOGRAMA", allocationSize = 1)
    @Column(name = "ID_CRONOGRAMA")
    private Long idCronograma;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA", nullable = false)
    private Convocatoria convocatoria;

    /** PUBLICACION, POSTULACION, EVAL_CURRICULAR, RESULT_CURRICULAR,
     *  EVAL_TECNICA, RESULT_TECNICA, ENTREVISTA, RESULTADO, SUSCRIPCION */
    @Column(name = "ETAPA", nullable = false, length = 30)
    private String etapa;

    @Column(name = "ACTIVIDAD", nullable = false, length = 300)
    private String actividad;

    @Column(name = "FECHA_INICIO", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "FECHA_FIN", nullable = false)
    private LocalDate fechaFin;

    @Column(name = "RESPONSABLE", length = 100)
    private String responsable;

    @Column(name = "AREA_RESP_1", length = 100)
    private String areaResp1;

    @Column(name = "AREA_RESP_2", length = 100)
    private String areaResp2;

    @Column(name = "AREA_RESP_3", length = 100)
    private String areaResp3;

    @Column(name = "LUGAR", length = 200)
    private String lugar;

    @Column(name = "ORDEN")
    private Integer orden;

    @Column(name = "ESTADO", length = 20)
    @Builder.Default
    private String estado = "ACTIVO";

    @Column(name = "FECHA_CREACION", updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "USUARIO_CREACION", length = 50)
    private String usuarioCreacion;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
    }
}
