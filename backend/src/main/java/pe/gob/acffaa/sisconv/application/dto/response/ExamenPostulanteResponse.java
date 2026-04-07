package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response del examen rendido — lo que ve el postulante y/o ORH.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExamenPostulanteResponse {
    private Long idExamenPostulante;
    private String estado;
    private LocalDateTime horaInicio;
    private LocalDateTime horaFin;
    private Integer totalPreguntas;
    private Integer totalCorrectas;
    private BigDecimal puntajeTotal;
    private long segundosRestantes;
    private boolean mostrarResultado;

    /** Preguntas — solo se incluyen si el examen está EN_CURSO (sin respuesta correcta). */
    private List<PreguntaExamenResponse> preguntas;

    private String mensaje;

    /** Resultados consolidados por postulante — solo para ORH. */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ResultadoConsolidado {
        private Long idPostulacion;
        private String nombrePostulante;
        private String codigoAnonimo;
        private String estadoExamen;
        /** Suma puntos ítems del banco (examen). */
        private BigDecimal puntajeTotal;
        /** Puntaje normalizado a escala E12 (null si examen no finalizado). */
        private BigDecimal puntajeTecnicaEscala;
        /** APTO / NO_APTO / PENDIENTE — coherente con umbral técnica convocatoria. */
        private String resultadoTecnica;
        private Integer totalCorrectas;
        private Integer totalPreguntas;
    }
}
