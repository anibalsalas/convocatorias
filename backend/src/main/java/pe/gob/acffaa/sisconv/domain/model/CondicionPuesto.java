package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * Condiciones esenciales del contrato CAS — D.Leg. 1057 Art. 6.
 * Tabla: TBL_CONDICION_PUESTO (V4 PKG-01). Relación 1:1 con TBL_PERFIL_PUESTO.
 * V16: agrega horario, días laborales, modalidad y tipo de inicio (para Bases PDF E16).
 */
@Entity
@Table(name = "TBL_CONDICION_PUESTO")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CondicionPuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_condicion_puesto")
    @SequenceGenerator(name = "seq_condicion_puesto", sequenceName = "SEQ_CONDICION_PUESTO", allocationSize = 1)
    @Column(name = "ID_CONDICION_PUESTO")
    private Long idCondicionPuesto;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_PERFIL_PUESTO", nullable = false, unique = true)
    private PerfilPuesto perfilPuesto;

    /** Monto mensual en soles según escala de la entidad */
    @Column(name = "REMUNERACION_MENSUAL", nullable = false, precision = 10, scale = 2)
    private BigDecimal remuneracionMensual;

    @Column(name = "DURACION_CONTRATO", nullable = false, length = 100)
    private String duracionContrato;

    @Column(name = "LUGAR_PRESTACION", nullable = false, length = 300)
    private String lugarPrestacion;

    /** Máximo 48 horas según D.Leg. 1057 */
    @Column(name = "JORNADA_SEMANAL")
    @Builder.Default
    private Integer jornadaSemanal = 48;

    @Column(name = "OTRAS_CONDICIONES", length = 1000)
    private String otrasCondiciones;

    // ── Campos V16: horario, modalidad y tipo de inicio (para Bases PDF E16) ──

    /** Hora de inicio de jornada laboral, formato HH:MM. Ej: "08:30" */
    @Column(name = "HORARIO_INICIO", length = 5)
    private String horarioInicio;

    /** Hora de fin de jornada laboral, formato HH:MM. Ej: "17:00" */
    @Column(name = "HORARIO_FIN", length = 5)
    private String horarioFin;

    /** Días laborales. Ej: "Lunes a viernes", "Lunes a sábado" */
    @Column(name = "DIAS_LABORALES", length = 100)
    private String diasLaborales;

    /** Modalidad de prestación del servicio: PRESENCIAL, REMOTO, SEMIPRESENCIAL */
    @Column(name = "MODALIDAD_SERVICIO", length = 30)
    private String modalidadServicio;

    /** Tipo de inicio: INMEDIATO, FECHA_FIJA, A_LA_FIRMA */
    @Column(name = "TIPO_INICIO_CONTRATO", length = 30)
    private String tipoInicioContrato;
}
