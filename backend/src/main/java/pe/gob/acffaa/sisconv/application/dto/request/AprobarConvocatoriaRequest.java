package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * E15 Request — PUT /convocatorias/{id}/aprobar.
 * D.S. 065-2011-PCM: Publicación simultánea Portal ACFFAA + Talento Perú.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AprobarConvocatoriaRequest {

    @NotNull(message = "Campo aprobada es obligatorio")
    private Boolean aprobada;

    private String linkTalentoPeru;
    private String linkPortalAcffaa;
}
