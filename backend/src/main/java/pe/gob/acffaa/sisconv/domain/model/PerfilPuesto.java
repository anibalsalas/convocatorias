package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Perfil del puesto CAS requerido — RPE 065-2020-SERVIR.
 * Tabla: TBL_PERFIL_PUESTO.
 */
@Entity
@Table(name = "TBL_PERFIL_PUESTO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerfilPuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_perfil_puesto")
    @SequenceGenerator(name = "seq_perfil_puesto", sequenceName = "SEQ_PERFIL_PUESTO", allocationSize = 1)
    @Column(name = "ID_PERFIL_PUESTO")
    private Long idPerfilPuesto;

    @Column(name = "NOMBRE_PUESTO", length = 300)
    private String nombrePuesto;

    @Column(name = "DENOMINACION_PUESTO", nullable = false, length = 300)
    private String denominacionPuesto;

    @Column(name = "UNIDAD_ORGANICA", nullable = false, length = 200)
    private String unidadOrganica;

    @Column(name = "ID_AREA_SOLICITANTE", nullable = false)
    private Long idAreaSolicitante;

    @Column(name = "ID_NIVEL_PUESTO")
    private Long idNivelPuesto;

    /** Campo legado. Se mantiene para compatibilidad de datos históricos. */
    @Column(name = "ID_NIVEL_FORMACION")
    private Long idNivelFormacion;

    @Column(name = "DEPENDENCIA_JERARQUICA_LINEAL", length = 250)
    private String dependenciaJerarquicaLineal;

    @Column(name = "DEPENDENCIA_FUNCIONAL", length = 250)
    private String dependenciaFuncional;

    @Column(name = "PUESTOS_A_CARGO")
    private Integer puestosCargo;

    /** Campos planos legados, mantenidos por compatibilidad. */
    @Column(name = "EXPERIENCIA_GENERAL", length = 200)
    private String experienciaGeneral;

    @Column(name = "EXPERIENCIA_ESPECIFICA", length = 200)
    private String experienciaEspecifica;

    @Column(name = "HABILIDADES", length = 500)
    private String habilidades;

    @Column(name = "FORMACION_ACADEMICA", length = 500)
    private String formacionAcademica;

    @Column(name = "CURSOS_ESPECIALIZACION", length = 500)
    private String cursosEspecializacion;

    @Column(name = "CONOCIMIENTOS_PUESTO", length = 500)
    private String conocimientosPuesto;

    @Column(name = "MISION_PUESTO", length = 1000)
    private String misionPuesto;

    @Column(name = "CANTIDAD_PUESTOS", nullable = false)
    @Builder.Default
    private Integer cantidadPuestos = 1;

    @Column(name = "ESTADO", nullable = false, length = 20)
    @Builder.Default
    private String estado = "PENDIENTE";

    @Column(name = "USUARIO_CREACION", nullable = false, length = 50)
    private String usuarioCreacion;

    @Column(name = "FECHA_CREACION", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "VALIDADO_CONTRA_MPP")
    @Builder.Default
    private Boolean validadoContraMpp = false;

    @Column(name = "OBSERVACIONES", length = 1000)
    private String observaciones;

    @Column(name = "FECHA_VALIDACION")
    private LocalDateTime fechaValidacion;

    @Column(name = "USUARIO_VALIDACION", length = 50)
    private String usuarioValidacion;

    @Column(name = "FECHA_APROBACION")
    private LocalDateTime fechaAprobacion;

    @Column(name = "USUARIO_APROBACION", length = 50)
    private String usuarioAprobacion;

    @Column(name = "USUARIO_MODIFICACION", length = 50)
    private String usuarioModificacion;

    @Column(name = "FECHA_MODIFICACION")
    private LocalDateTime fechaModificacion;

    @OneToMany(mappedBy = "perfilPuesto", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PerfilFormacionAcademica> formacionesAcademicas = new ArrayList<>();

    @OneToMany(mappedBy = "perfilPuesto", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PerfilConocimiento> conocimientos = new ArrayList<>();

    @OneToMany(mappedBy = "perfilPuesto", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PerfilExperiencia> experiencias = new ArrayList<>();

    @OneToMany(mappedBy = "perfilPuesto", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RequisitoPerfil> requisitos = new ArrayList<>();

    @OneToMany(mappedBy = "perfilPuesto", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<FuncionPuesto> funciones = new ArrayList<>();

    @OneToOne(mappedBy = "perfilPuesto", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private CondicionPuesto condicion;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.fechaModificacion = LocalDateTime.now();
    }
}
