package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * TBL_TACHA — DDL_NEW.sql (12 columnas)
 * CK_TACHA_ESTADO: PRESENTADA, FUNDADA, INFUNDADA
 * FK: ID_USUARIO_RESOLUCION → TBL_USUARIO
 */
@Entity
@Table(name = "TBL_TACHA")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Tacha {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_tacha")
    @SequenceGenerator(name = "seq_tacha", sequenceName = "SEQ_TACHA", allocationSize = 1)
    @Column(name = "ID_TACHA")
    private Long idTacha;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULACION", nullable = false)
    private Postulacion postulacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA", nullable = false)
    private Convocatoria convocatoria;

    @Column(name = "MOTIVO", nullable = false, length = 1000)
    private String motivo;

    @Column(name = "EVIDENCIA", length = 500)
    private String evidencia;

    @Column(name = "RUTA_ADJUNTO", length = 500)
    private String rutaAdjunto;

    @Column(name = "ESTADO", nullable = false, length = 20)
    @Builder.Default
    private String estado = "PRESENTADA";

    @Column(name = "RESOLUCION", length = 1000)
    private String resolucion;

    @Column(name = "FECHA_RESOLUCION")
    private LocalDateTime fechaResolucion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_USUARIO_RESOLUCION")
    private Usuario usuarioResolucion;

    @Column(name = "FECHA_PRESENTACION", updatable = false)
    private LocalDateTime fechaPresentacion;

    @Column(name = "USUARIO_CREACION", length = 50, updatable = false)
    private String usuarioCreacion;

    @PrePersist
    protected void onCreate() { this.fechaPresentacion = LocalDateTime.now(); }
}
