package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;

/** E33 — POST /contratos/{id}/verificar-documentos. CU-23, BPMN 4.2+4.4, RN-22. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VerificarDocumentosRequest {

    @NotNull @Size(min = 1) @Valid
    private List<VerificacionItem> verificaciones;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class VerificacionItem {
        @NotNull private Long idExpediente;
        @NotBlank private String tipoDocumento;
        /** 'S' = conforme, 'N' = no conforme */
        @NotBlank @Pattern(regexp = "[SN]") private String documentoConforme;
        private String observacion;
    }
}
