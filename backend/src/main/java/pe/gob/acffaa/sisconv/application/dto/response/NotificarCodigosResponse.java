package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;

/**
 * Response E25-NOTIF — ORH notifica al COMITÉ que los códigos anónimos están listos.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificarCodigosResponse {
    private Long idConvocatoria;
    private String numeroConvocatoria;
    private Integer cantidadAptos;
    private String mensaje;
}
