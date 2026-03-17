package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * DTO Request para autenticación — AF §8 M05: POST /auth/login
 * SAD §9.1 Capa 4: Bean Validation en DTOs
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class LoginRequest {
    @NotBlank(message = "Username es obligatorio")
    private String username;

    @NotBlank(message = "Contraseña es obligatoria")
    private String password;
}
