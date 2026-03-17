package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Response unificado para operaciones de contrato CAS (E32, E34, E35, E37).
 * Campos opcionales según el endpoint: se setean solo los relevantes.
 *
 * Coherencia: Endpoints_DTOs_v2 §5 (E32-E37)
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContratoResponse {
    private Long idContrato;
    private String numeroContrato;
    private String postulante;
    private String estado;
    private String procesoEstado;
    private String mensaje;

    // ── E32 Notificación ──
    private Boolean notificacionEnviada;
    private String emailEnviadoA;
    private LocalDate plazoVencimiento;

    // ── E34 Suscripción ──
    private LocalDate fechaSuscripcion;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private BigDecimal montoMensual;

    // ── E35 Accesitario ──
    private Boolean esAccesitario;
    private Integer ordenConvocado;

    // ── E37 Cierre ──
    private Boolean resultadosPublicados;
    private Boolean notificacionesEnviadas;
    private Long logTransparenciaId;
}
