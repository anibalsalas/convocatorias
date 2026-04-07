package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * DTO para condiciones contractuales CAS — D.Leg. 1057 Art. 6.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CondicionPuestoRequest {

    @NotNull(message = "Remuneración mensual es obligatoria")
    @DecimalMin(value = "0.01", message = "Remuneración debe ser mayor a 0")
    private BigDecimal remuneracionMensual;

    @NotBlank(message = "Duración del contrato es obligatoria")
    @Size(max = 100, message = "Duración no debe exceder 100 caracteres")
    private String duracionContrato;

    @NotBlank(message = "Lugar de prestación es obligatorio")
    @Size(max = 300, message = "Lugar no debe exceder 300 caracteres")
    private String lugarPrestacion;

    @Max(value = 48, message = "Jornada semanal máxima es 48 horas según D.Leg. 1057")
    private Integer jornadaSemanal = 48;

    @Size(max = 1000, message = "Otras condiciones no debe exceder 1000 caracteres")
    private String otrasCondiciones;

    // ── Campos V16: horario, modalidad y tipo de inicio ──

    /** Formato HH:MM (ej: "08:30"). Cadena vacía permitida. */
    @Pattern(regexp = "^$|^([01]\\d|2[0-3]):[0-5]\\d$",
             message = "Horario de inicio debe tener formato HH:MM (ej: 08:30)")
    private String horarioInicio;

    /** Formato HH:MM (ej: "17:00"). Cadena vacía permitida. */
    @Pattern(regexp = "^$|^([01]\\d|2[0-3]):[0-5]\\d$",
             message = "Horario de fin debe tener formato HH:MM (ej: 17:00)")
    private String horarioFin;

    @Size(max = 100, message = "Días laborales no debe exceder 100 caracteres")
    private String diasLaborales;

    /** PRESENCIAL, REMOTO o SEMIPRESENCIAL — vacío permitido. */
    @Pattern(regexp = "^$|^(PRESENCIAL|REMOTO|SEMIPRESENCIAL)$",
             message = "Modalidad debe ser PRESENCIAL, REMOTO o SEMIPRESENCIAL")
    private String modalidadServicio;

    /** INMEDIATO, FECHA_FIJA o A_LA_FIRMA — vacío permitido. */
    @Pattern(regexp = "^$|^(INMEDIATO|FECHA_FIJA|A_LA_FIRMA)$",
             message = "Tipo de inicio debe ser INMEDIATO, FECHA_FIJA o A_LA_FIRMA")
    private String tipoInicioContrato;
}
