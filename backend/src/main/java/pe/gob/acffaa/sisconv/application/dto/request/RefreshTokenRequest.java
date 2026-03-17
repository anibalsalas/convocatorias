package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * DTO Request para renovación/cierre de sesión — AF §8 M05
 * Usado en: POST /auth/refresh y POST /auth/logout
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class RefreshTokenRequest {
    @NotBlank(message = "Refresh token es obligatorio")
    private String refreshToken;
}
