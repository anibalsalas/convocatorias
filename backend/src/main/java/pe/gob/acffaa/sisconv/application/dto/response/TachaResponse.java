package pe.gob.acffaa.sisconv.application.dto.response;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TachaResponse {
    private Long idTacha;
    private Long idPostulacion;
    private Long idConvocatoria;
    private String motivo;
    private String evidencia;
    private String rutaAdjunto;
    private String estado;
    private String resolucion;
    private LocalDateTime fechaPresentacion;
    private LocalDateTime fechaResolucion;
    private String mensaje;
}
