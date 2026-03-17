package pe.gob.acffaa.sisconv.application.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ActaResponse {
    private Long idActa;
    private String tipoActa;
    private String numeroActa;
    private LocalDate fechaActa;
    private String rutaArchivoPdf;
    private String estado;
    private Boolean firmada;
    private LocalDate fechaCargaFirma;
    private String mensaje;
}
