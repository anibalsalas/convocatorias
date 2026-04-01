package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

/**
 * Request para E20-Individual — aplicar filtro RF-07 por postulante.
 * decision: "ADMITIR" (→ VERIFICADO) | "NO_ADMITIR" (→ NO_APTO).
 * Prerequisito: D.L.1451 completado para ADMITIR.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AplicarFiltroRequest {

    @NotBlank(message = "La decisión es obligatoria")
    @Pattern(regexp = "ADMITIR|NO_ADMITIR", message = "La decisión debe ser ADMITIR o NO_ADMITIR")
    private String decision;
}
