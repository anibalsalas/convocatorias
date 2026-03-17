package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * TBL_POSTULANTE — extendido para Mi Perfil / Datos Personales.
 */
@Entity
@Table(name = "TBL_POSTULANTE",
       uniqueConstraints = {
           @UniqueConstraint(name = "UK_POSTULANTE_DOC",
               columnNames = {"TIPO_DOCUMENTO", "NUMERO_DOCUMENTO"}),
           @UniqueConstraint(name = "UK_POSTULANTE_EMAIL",
               columnNames = {"EMAIL"})
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Postulante {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_postulante")
    @SequenceGenerator(name = "seq_postulante", sequenceName = "SEQ_POSTULANTE", allocationSize = 1)
    @Column(name = "ID_POSTULANTE")
    private Long idPostulante;

    @Column(name = "TIPO_DOCUMENTO", nullable = false, length = 20)
    private String tipoDocumento;

    @Column(name = "NUMERO_DOCUMENTO", nullable = false, length = 20)
    private String numeroDocumento;

    @Column(name = "APELLIDO_PATERNO", nullable = false, length = 100)
    private String apellidoPaterno;

    @Column(name = "APELLIDO_MATERNO", length = 100)
    private String apellidoMaterno;

    @Column(name = "NOMBRES", nullable = false, length = 150)
    private String nombres;

    @Column(name = "FECHA_NACIMIENTO")
    private LocalDate fechaNacimiento;

    @Column(name = "GENERO", length = 1)
    private String genero;

    @Column(name = "ESTADO_CIVIL", length = 20)
    private String estadoCivil;

    @Column(name = "TELEFONO", length = 20)
    private String telefono;

    @Column(name = "TELEFONO_FIJO", length = 20)
    private String telefonoFijo;

    @Column(name = "EMAIL", length = 200)
    private String email;

    @Column(name = "DIRECCION", length = 500)
    private String direccion;

    @Column(name = "UBIGEO", length = 6)
    private String ubigeo;

    @Column(name = "RUC", length = 11)
    private String ruc;

    @Column(name = "NRO_BREVETE", length = 20)
    private String nroBrevete;

    @Column(name = "CATEGORIA_BREVETE", length = 30)
    private String categoriaBrevete;

    @Column(name = "TIENE_COLEGIATURA")
    @Builder.Default
    private Boolean tieneColegiatura = false;

    @Column(name = "TIENE_HABILITACION_PROF")
    @Builder.Default
    private Boolean tieneHabilitacionProf = false;

    @Column(name = "NRO_COLEGIATURA", length = 50)
    private String nroColegiatura;

    @Column(name = "ESTA_EN_REDAM")
    @Builder.Default
    private Boolean estaEnRedam = false;

    @Column(name = "ESTA_EN_RNSSC")
    @Builder.Default
    private Boolean estaEnRnssc = false;

    @Column(name = "ESTA_EN_REDERECI")
    @Builder.Default
    private Boolean estaEnRedereci = false;

    @Column(name = "TIENE_ANTECEDENTES_PENALES")
    @Builder.Default
    private Boolean tieneAntecedentesPenales = false;

    @Column(name = "TIENE_ANTECEDENTES_POLICIALES")
    @Builder.Default
    private Boolean tieneAntecedentesPoliciales = false;

    @Column(name = "TIENE_ANTECEDENTES_JUDICIALES")
    @Builder.Default
    private Boolean tieneAntecedentesJudiciales = false;

    @Column(name = "ACEPTA_DECLARACION_JURADA")
    @Builder.Default
    private Boolean aceptaDeclaracionJurada = false;

    @Column(name = "DETALLE_DECLARACION_JURADA", length = 2000)
    private String detalleDeclaracionJurada;

    @Column(name = "ES_LICENCIADO_FFAA")
    @Builder.Default
    private Boolean esLicenciadoFfaa = false;

    @Column(name = "ES_PERSONA_DISCAP")
    @Builder.Default
    private Boolean esPersonaDiscap = false;

    @Column(name = "ES_DEPORTISTA_DEST")
    @Builder.Default
    private Boolean esDeportistaDest = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_USUARIO")
    private Usuario usuario;

    @Column(name = "ESTADO", length = 20)
    @Builder.Default
    private String estado = "ACTIVO";

    @Column(name = "FECHA_CREACION", updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "USUARIO_CREACION", length = 50, updatable = false)
    private String usuarioCreacion;

    @Column(name = "FECHA_MODIFICACION")
    private LocalDateTime fechaModificacion;

    @Column(name = "USUARIO_MODIFICACION", length = 50)
    private String usuarioModificacion;

    @Column(name = "DELETED_AT")
    private LocalDateTime deletedAt;

    @Version
    @Column(name = "VERSION")
    private Long version;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
        if (this.version == null) {
            this.version = 0L;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.fechaModificacion = LocalDateTime.now();
    }
}