package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response de configuración del examen — visible para ORH.
 * Incluye factores TECNICA de la convocatoria (comité) y rango del cronograma EVAL_TECNICA.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConfigExamenResponse {
    private Long idConfigExamen;
    private Long idConvocatoria;
    /** Número visible CAS-XXX-YYYY */
    private String numeroConvocatoria;
    private Integer cantidadPreguntas;
    private LocalDateTime fechaHoraInicio;
    private LocalDateTime fechaHoraFin;
    private Integer duracionMinutos;
    private Boolean mostrarResultado;
    private String estado;
    private Boolean notificacionEnviada;
    /** Postulantes APTO notificados en el último envío (null si aún no se notifica). */
    private Integer postulantesNotificados;
    private long totalPreguntasBanco;
    private String mensaje;

    /** Suma factores TECNICA raíz — misma escala que E12 / registrarPuntajeTecnica */
    private BigDecimal puntajeMinimoTecnica;
    private BigDecimal puntajeMaximoTecnica;

    /** Rango cronograma etapa EVAL_TECNICA (E10); null si no hay actividad registrada */
    private String fechaInicioCronogramaTecnica;
    private String fechaFinCronogramaTecnica;
}
