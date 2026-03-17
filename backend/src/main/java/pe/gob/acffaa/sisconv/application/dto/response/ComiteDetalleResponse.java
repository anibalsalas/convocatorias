package pe.gob.acffaa.sisconv.application.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.util.List;

/**
 * Detalle del Comité con lista de miembros.
 * GET /convocatorias/{id}/comite
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ComiteDetalleResponse {
    private Long idComite;
    private Long idConvocatoria;
    private String numeroConvocatoria;
    private String numeroResolucion;
    private String fechaDesignacion;
    private String estado;
    private List<MiembroItem> miembros;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class MiembroItem {
        private Long idMiembroComite;
        private String nombresCompletos;
        private String cargo;
        private String rolComite;
        private Boolean esTitular;
        private String estado;
    }
}
