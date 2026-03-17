package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostulanteDocumentoResponse {

    private Long idDocumento;
    private String tipoDocumento;
    private String nombreArchivo;
    private Long tamanoKb;
    private String estado;
}