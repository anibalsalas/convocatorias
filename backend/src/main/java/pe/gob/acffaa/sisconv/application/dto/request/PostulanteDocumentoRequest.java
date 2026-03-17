package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostulanteDocumentoRequest {

    @NotBlank(message = "El tipo de documento es obligatorio")
    @Size(max = 150, message = "El tipo de documento no debe exceder 150 caracteres")
    private String tipoDocumento;
}