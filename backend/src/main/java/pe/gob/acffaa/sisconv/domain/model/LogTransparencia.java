package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * TBL_LOG_TRANSPARENCIA — Log de auditoría y transparencia RF-18
 * AF §7.2 Nivel 6: Transversales | AF §9 RNF-04: Auditabilidad
 * D.L. 1451: Registra TODA transición de estado con IP, User-Agent, usuario, timestamp
 * SAD §5.3: Persistido por AOP @LogTransparencia
 */
@Entity
@Table(name = "TBL_LOG_TRANSPARENCIA")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LogTransparencia {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_log")
    @SequenceGenerator(name = "seq_log", sequenceName = "SEQ_LOG_TRANSPARENCIA", allocationSize = 1)
    @Column(name = "ID_LOG")
    private Long idLog;

    @Column(name = "ID_CONVOCATORIA")
    private Long idConvocatoria;

    @Column(name = "ID_POSTULACION")
    private Long idPostulacion;

    @Column(name = "ENTIDAD", nullable = false, length = 100)
    private String entidad;

    @Column(name = "ID_ENTIDAD")
    private Long idEntidad;

    @Column(name = "ACCION", nullable = false, length = 50)
    private String accion;

    @Column(name = "ESTADO_ANTERIOR", length = 30)
    private String estadoAnterior;

    @Column(name = "ESTADO_NUEVO", length = 30)
    private String estadoNuevo;

    @Column(name = "IP_ORIGEN", length = 45)
    private String ipOrigen;

    @Column(name = "USER_AGENT", length = 500)
    private String userAgent;

    @Column(name = "USUARIO_ACCION", nullable = false, length = 50)
    private String usuarioAccion;

    @Column(name = "FECHA_ACCION", nullable = false)
    private LocalDateTime fechaAccion;

    /** Justificación obligatoria del cambio — D.L. 1451 (mínimo 10 caracteres). */
    @Column(name = "SUSTENTO", nullable = false, length = 1000)
    private String sustento;

    @Column(name = "DATOS_ADICIONALES", length = 4000)
    private String datosAdicionales;

    @PrePersist
    protected void onCreate() {
        this.fechaAccion = LocalDateTime.now();
    }
}
