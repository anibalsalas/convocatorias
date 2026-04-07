package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;

/**
 * Pregunta individual tal como la ve el postulante — SIN respuesta correcta.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PreguntaExamenResponse {
    private Long idPregunta;
    private Integer orden;
    private String enunciado;
    private String opcionA;
    private String opcionB;
    private String opcionC;
    private String opcionD;
}
