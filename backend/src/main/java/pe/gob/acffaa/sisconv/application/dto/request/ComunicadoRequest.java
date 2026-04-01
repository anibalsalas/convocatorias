package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Request para publicar un comunicado oficial.
 * DS 083-2019-PCM Art. 10 — aclaraciones / ampliaciones de plazo.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComunicadoRequest {

    @NotBlank(message = "El título es obligatorio")
    @Size(max = 200, message = "El título no debe superar 200 caracteres")
    private String titulo;

    @NotBlank(message = "La descripción es obligatoria")
    private String descripcion;
}
