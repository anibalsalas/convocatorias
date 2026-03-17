package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Acta de Instalación / Resultado del Comité — CU-09, E13/E14.
 * Tabla: TBL_ACTA.
 *
 * FK: TBL_CONVOCATORIA.
 * Constraints: CK_ACTA_TIPO (INSTALACION|RESULTADO),
 *              CK_ACTA_ESTADO (GENERADA|FIRMADA|ANULADA)
 *
 * Coherencia: DLL_03.sql líneas 203-216
 */
@Entity
@Table(name = "TBL_ACTA")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Acta {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_acta")
    @SequenceGenerator(name = "seq_acta", sequenceName = "SEQ_ACTA", allocationSize = 1)
    @Column(name = "ID_ACTA")
    private Long idActa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_CONVOCATORIA", nullable = false)
    private Convocatoria convocatoria;

    /** INSTALACION, RESULTADO */
    @Column(name = "TIPO_ACTA", nullable = false, length = 20)
    private String tipoActa;

    @Column(name = "NUMERO_ACTA", length = 50)
    private String numeroActa;

    @Column(name = "FECHA_ACTA")
    private LocalDate fechaActa;

    /** Ruta del PDF generado por el sistema (E13) */
    @Column(name = "RUTA_ARCHIVO_PDF", length = 500)
    private String rutaArchivoPdf;

    /** Ruta del PDF firmado y escaneado (E14) */
    @Column(name = "RUTA_ARCHIVO_FIRMADO", length = 500)
    private String rutaArchivoFirmado;

    @Column(name = "FIRMADA")
    @Builder.Default
    private Boolean firmada = false;

    @Column(name = "FECHA_CARGA_FIRMA")
    private LocalDate fechaCargaFirma;

    /** GENERADA, FIRMADA, ANULADA */
    @Column(name = "ESTADO", length = 20)
    @Builder.Default
    private String estado = "GENERADA";

    @Column(name = "FECHA_CREACION", updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "USUARIO_CREACION", length = 50)
    private String usuarioCreacion;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
    }
}
