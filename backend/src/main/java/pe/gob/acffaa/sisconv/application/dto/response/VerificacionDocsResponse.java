package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;

/**
 * Response para verificación de documentos (E33).
 * Consolida resultado de todas las verificaciones del contrato.
 *
 * Coherencia: Endpoints_DTOs_v2 §5 (E33), RN-22/RN-24
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VerificacionDocsResponse {
    private Long idContrato;
    private Integer totalDocumentos;
    private Integer conformes;
    private Integer noConformes;
    private Boolean docsVerificados;
    private String mensaje;
}
