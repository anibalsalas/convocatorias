package pe.gob.acffaa.sisconv.application.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CuadroMeritosResponse {
    private Long idConvocatoria;
    private String numeroConvocatoria;
    private Integer totalPostulantes;
    private List<MeritoItem> cuadro;
    private String mensaje;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MeritoItem {
        private Integer ordenMerito;
        private Long idPostulacion;
        private String nombrePostulante;
        private BigDecimal puntajeCurricular;
        private BigDecimal puntajeTecnica;
        private BigDecimal puntajeEntrevista;
        private BigDecimal puntajeBonificacion;
        private BigDecimal puntajeTotal;
        /** APTO | NO APTO | — (umbral factor padre ENTREVISTA vs puntaje registrado). */
        private String resultadoEntrevista;
        /** GANADOR | ACCESITARIO | NO_SELECCIONADO (RF-16). */
        private String resultado;
    }
}
