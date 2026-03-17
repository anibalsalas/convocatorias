package pe.gob.acffaa.sisconv.presentation.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.service.AuthService;

/**
 * CU-27: Autenticación JWT — AF §8 M05: POST login/refresh/logout
 * SAD §5.1: Flujo completo 5 pasos con invalidación server-side del refresh token
 * SAD §3.2: presentation/controller/ — Capa 4 exterior
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    public AuthController(AuthService authService) { this.authService = authService; }

    /**
     * SAD §5.1 Paso 1: Login → genera Access Token (30min) + Refresh Token (24h)
     * Inserta refresh token en whitelist (TBL_REFRESH_TOKEN)
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(
            @Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.ok(
                authService.login(request, httpRequest), "Autenticación exitosa"));
    }

    /**
     * SAD §5.1 Paso 4: Refresh → valida whitelist, rota tokens
     * Token viejo se elimina, nuevo se inserta (rotación de refresh tokens)
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.ok(
                authService.refreshToken(request, httpRequest), "Token renovado"));
    }

    /**
     * SAD §5.1 Paso 5: "Logout invalida el refresh token"
     * ELIMINA el refresh token de la whitelist (TBL_REFRESH_TOKEN)
     * Después de esto, el refresh token ya no sirve para obtener nuevos access tokens
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @Valid @RequestBody RefreshTokenRequest request, HttpServletRequest httpRequest) {
        authService.logout(request.getRefreshToken(), httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(null,
                "Sesión cerrada. Refresh token invalidado en servidor."));
    }

    /**
     * ETAPA6 B2: Registro público de postulante (self-register)
     * Username auto-derivado: {tipoDocumento}{numeroDocumento} → DNI12345678
     * Retorna TokenResponse (auto-login) para evitar doble paso registro→login
     * SecurityConfig: /auth/** ya tiene .permitAll()
     */
    @PostMapping("/register-postulante")
    public ResponseEntity<ApiResponse<TokenResponse>> registerPostulante(
            @Valid @RequestBody RegisterPostulanteRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.status(201).body(ApiResponse.ok(
                authService.registerPostulante(request, httpRequest), "Registro exitoso"));
    }
}
