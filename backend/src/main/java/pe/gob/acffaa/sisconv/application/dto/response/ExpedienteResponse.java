package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpedienteResponse {
    private Long idExpediente;
    private Long idPostulacion;
    private String tipoDocumento;
    private String nombreArchivo;
    /** Ruta relativa al storagePath: "expedientes/{idPost}/{nombreArchivo}" */
    private String rutaArchivo;
    private String hashSha256;
    private Boolean verificado;
    private LocalDateTime fechaVerificacion;
    private LocalDateTime fechaCarga;
    private Long tamanoKb;
    private String estado;
    private String mensaje;
}