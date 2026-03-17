package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * TBL_POSTULACION — DDL_NEW.sql (20 columnas)
 * CK_POST_ESTADO: REGISTRADO,VERIFICADO,APTO,NO_APTO,DESCALIFICADO,GANADOR,ACCESITARIO,NO_SELECCIONADO
 * CK_POST_RESULTADO: NULL | GANADOR,ACCESITARIO,NO_SELECCIONADO,DESIERTO
 * UK_POST_CONV_POSTULANTE(ID_CONVOCATORIA, ID_POSTULANTE)
 * FK: ID_CONVOCATORIA, ID_POSTULANTE, ID_PERFIL_PUESTO
 */
@Entity
@Table(name = "TBL_POSTULACION",
       uniqueConstraints = @UniqueConstraint(name = "UK_POST_CONV_POSTULANTE",
           columnNames = {"ID_CONVOCATORIA", "ID_POSTULANTE"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Postulacion {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_postulacion")
    @SequenceGenerator(name = "seq_postulacion", sequenceName = "SEQ_POSTULACION", allocationSize = 1)
    @Column(name = "ID_POSTULACION")
    private Long idPostulacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA", nullable = false)
    private Convocatoria convocatoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_POSTULANTE", nullable = false)
    private Postulante postulante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_PERFIL_PUESTO")
    private PerfilPuesto perfilPuesto;

    @Column(name = "CODIGO_ANONIMO", length = 20)
    private String codigoAnonimo;

    @Column(name = "VERIFICACION_RNSSC", length = 30)
    private String verificacionRnssc;

    @Column(name = "VERIFICACION_REGIPREC", length = 30)
    private String verificacionRegiprec;

    @Column(name = "FECHA_VERIFICACION_DL")
    private LocalDateTime fechaVerificacionDl;

    @Column(name = "PUNTAJE_CURRICULAR", precision = 5, scale = 2)
    private BigDecimal puntajeCurricular;

    @Column(name = "PUNTAJE_TECNICA", precision = 5, scale = 2)
    private BigDecimal puntajeTecnica;

    @Column(name = "PUNTAJE_ENTREVISTA", precision = 5, scale = 2)
    private BigDecimal puntajeEntrevista;

    @Column(name = "PUNTAJE_BONIFICACION", precision = 5, scale = 2)
    private BigDecimal puntajeBonificacion;

    @Column(name = "PUNTAJE_TOTAL", precision = 5, scale = 2)
    private BigDecimal puntajeTotal;

    @Column(name = "ORDEN_MERITO")
    private Integer ordenMerito;

    @Column(name = "RESULTADO", length = 20)
    private String resultado;

    @Column(name = "ESTADO", nullable = false, length = 30)
    @Builder.Default
    private String estado = "REGISTRADO";

    @Column(name = "FECHA_POSTULACION", updatable = false)
    private LocalDateTime fechaPostulacion;

    @Column(name = "FECHA_CONFIRMACION_EXPEDIENTE")
    private LocalDateTime fechaConfirmacionExpediente;

    @Column(name = "USUARIO_CONFIRMACION_EXPEDIENTE", length = 50)
    private String usuarioConfirmacionExpediente;

    @Column(name = "USUARIO_CREACION", length = 50, updatable = false)
    private String usuarioCreacion;

    @Column(name = "FECHA_MODIFICACION")
    private LocalDateTime fechaModificacion;

    @Column(name = "USUARIO_MODIFICACION", length = 50)
    private String usuarioModificacion;

    @PrePersist
    protected void onCreate() { this.fechaPostulacion = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { this.fechaModificacion = LocalDateTime.now(); }
}
