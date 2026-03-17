package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Solicitud formal de contratación CAS — BPMN Etapa 1: Requerimiento de Personal.
 * Tabla: TBL_REQUERIMIENTO (CU-03, CU-04, CU-05).
 *
 * FK: TBL_AREA_ORGANIZACIONAL, TBL_USUARIO (solicitante), TBL_PERFIL_PUESTO.
 * Hijo: TBL_REGLA_MOTOR (E8 — Configurar Motor RF-14).
 *
 * Estados BPMN: ELABORADO → CON_PRESUPUESTO → CONFIGURADO
 *               ELABORADO → SIN_PRESUPUESTO (terminal)
 *
 * Coherencia: Endpoints_DTOs_v2 §2 (E6/E7/E8), Vista CU (CU-03/04/05), Diagrama Flujo Etapa 1
 */
@Entity
@Table(name = "TBL_REQUERIMIENTO")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Requerimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_requerimiento")
    @SequenceGenerator(name = "seq_requerimiento", sequenceName = "SEQ_REQUERIMIENTO", allocationSize = 1)
    @Column(name = "ID_REQUERIMIENTO")
    private Long idRequerimiento;

    /** Código correlativo: REQ-2026-0001 (SEQ_NUM_REQUERIMIENTO) */
    @Column(name = "NUMERO_REQUERIMIENTO", nullable = false, unique = true, length = 30)
    private String numeroRequerimiento;

    /** FK → TBL_PERFIL_PUESTO.ID_PERFIL_PUESTO — Perfil APROBADO asociado */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_PERFIL_PUESTO", nullable = false)
    private PerfilPuesto perfilPuesto;

    /** FK → TBL_AREA_ORGANIZACIONAL.ID_AREA */
    @Column(name = "ID_AREA_SOLICITANTE", nullable = false)
    private Long idAreaSolicitante;

    /** Sustento de la necesidad según D.S. 075-2008-PCM Art. 3 */
    @Column(name = "JUSTIFICACION", nullable = false, length = 2000)
    private String justificacion;

    /** Cantidad de puestos a cubrir — E6 Request */
    @Column(name = "CANTIDAD_PUESTOS", nullable = false)
    @Builder.Default
    private Integer cantidadPuestos = 1;

    /** FK → TBL_USUARIO.ID_USUARIO — responsable del área que solicita */
    @Column(name = "ID_USUARIO_SOLICITANTE", nullable = false)
    private Long idUsuarioSolicitante;

    @Column(name = "FECHA_SOLICITUD", nullable = false, updatable = false)
    private LocalDateTime fechaSolicitud;

    // ── Campos de Verificación Presupuestal (E7 — OPP) ──

    /** true = CON_PRESUPUESTO, false = SIN_PRESUPUESTO, null = no verificado aún */
    @Column(name = "TIENE_PRESUPUESTO")
    private Boolean tienePresupuesto;

    /** Número de certificación presupuestal emitida por OPP */
    @Column(name = "CERTIFICACION_PRESUPUESTAL", length = 50)
    private String certificacionPresupuestal;

    /** Número de operación en el SIAF-SP */
    @Column(name = "NUMERO_SIAF", length = 30)
    private String numeroSiaf;

    /** Observaciones de OPP sobre la verificación presupuestal */
    @Column(name = "OBSERVACION_PRESUPUESTAL", length = 1000)
    private String observacionPresupuestal;

    /** Fecha en que OPP realizó la verificación */
    @Column(name = "FECHA_CERT_PRESUPUESTAL")
    private LocalDate fechaCertPresupuestal;

    /** FK → TBL_USUARIO.ID_USUARIO — analista OPP que verificó */
    @Column(name = "ID_USUARIO_OPP")
    private Long idUsuarioOpp;

    // ── Estado BPMN ──

    /** ELABORADO, CON_PRESUPUESTO, SIN_PRESUPUESTO, CONFIGURADO */
    @Column(name = "ESTADO", nullable = false, length = 30)
    @Builder.Default
    private String estado = "ELABORADO";

    // ── Auditoría ──

    @Column(name = "USUARIO_CREACION", nullable = false, length = 50)
    private String usuarioCreacion;

    @Column(name = "FECHA_CREACION", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "USUARIO_MODIFICACION", length = 50)
    private String usuarioModificacion;

    @Column(name = "FECHA_MODIFICACION")
    private LocalDateTime fechaModificacion;

    @PrePersist
    protected void onCreate() {
        this.fechaSolicitud = LocalDateTime.now();
        this.fechaCreacion = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.fechaModificacion = LocalDateTime.now();
    }
}
