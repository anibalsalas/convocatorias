package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.util.List;

/**
 * Response E31 — publicar resultados.
 * Incluye el cuadro de méritos final y el conteo de notificaciones encoladas para envío asíncrono.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PublicarResultadosResponse {
    private Long idConvocatoria;
    private String numeroConvocatoria;
    private Integer totalPostulantes;
    private Integer notificacionesEncoladas;
    private List<CuadroMeritosResponse.MeritoItem> cuadro;
    private String mensaje;
}
