package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO para recuperación de contraseña — POST /auth/recuperar-contrasena.
 * Solo requiere el número de documento del postulante.
 */
@Getter
@Setter
public class RecuperarContrasenaRequest {

    @NotBlank(message = "El número de documento es obligatorio")
    private String numeroDocumento;
}
