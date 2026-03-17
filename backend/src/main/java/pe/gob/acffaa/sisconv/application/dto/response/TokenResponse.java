package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.util.List;

/**
 * DTO Response para autenticación JWT — SAD §5.1: Access Token + Refresh Token
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TokenResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
    private String username;
    private String nombreCompleto;
    private List<String> roles;
}
