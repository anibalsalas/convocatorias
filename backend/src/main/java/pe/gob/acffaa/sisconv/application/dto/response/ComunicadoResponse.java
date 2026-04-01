package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComunicadoResponse {
    private Long idComunicado;
    private Long idConvocatoria;
    private String numeroConvocatoria;
    private String titulo;
    private String descripcion;
    private LocalDateTime fechaPublicacion;
    private String usuarioCreacion;
    private String mensaje;
}
