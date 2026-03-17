package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Verificación de Documentos Originales — BPMN Etapa 4: Tarea 4.4.
 * Tabla: TBL_VERIFICACION_DOCUMENTO (CU-23).
 *
 * FK: TBL_CONTRATO_CAS, TBL_EXPEDIENTE_VIRTUAL, TBL_USUARIO (verificador).
 *
 * Regla RN-22: Verificación contra Expediente Virtual (hash SHA-256, RPE 065-2020).
 * Regla RN-24: Docs inválidos = mismo efecto que no presentar documentos.
 *
 * Coherencia: Endpoints_DTOs_v2 §5 (E33), DiagramaFlujo_04 (4.4 Gateway ¿Docs válidos?)
 */
@Entity
@Table(name = "TBL_VERIFICACION_DOCUMENTO")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VerificacionDocumento {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_verif_doc")
    @SequenceGenerator(name = "seq_verif_doc", sequenceName = "SEQ_VERIFICACION_DOCUMENTO", allocationSize = 1)
    @Column(name = "ID_VERIFICACION")
    private Long idVerificacion;

    /** FK → TBL_CONTRATO_CAS */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONTRATO", nullable = false)
    private ContratoCas contrato;

    /** FK → TBL_EXPEDIENTE_VIRTUAL — Documento digital a verificar */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_EXPEDIENTE", nullable = false)
    private ExpedienteVirtual expediente;

    /** FK → TBL_USUARIO — Verificador (extraído del JWT, RN-17) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_VERIFICADOR")
    private Usuario verificador;

    @Column(name = "TIPO_DOCUMENTO", nullable = false, length = 50)
    private String tipoDocumento;

    /** 'S' = conforme, 'N' = no conforme */
    @Column(name = "DOCUMENTO_CONFORME", nullable = false, length = 1)
    private String documentoConforme;

    @Column(name = "OBSERVACION", length = 500)
    private String observacion;

    @Column(name = "FECHA_VERIFICACION")
    private LocalDateTime fechaVerificacion;
}
