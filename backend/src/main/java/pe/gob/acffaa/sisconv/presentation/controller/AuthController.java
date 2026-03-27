package pe.gob.acffaa.sisconv.presentation.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.service.AuthService;

import java.util.concurrent.ConcurrentHashMap;

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

    // ── Rate limiting en memoria: IP → [intentos, inicioVentanaMs] ──────────
    private static final ConcurrentHashMap<String, long[]> IP_ATTEMPTS = new ConcurrentHashMap<>();
    private static final int  MAX_IP_INTENTOS = 10;      // 10 intentos por IP por minuto
    private static final long VENTANA_MS       = 60_000L;

    /**
     * SAD §5.1 Paso 1: Login → genera Access Token (30min) + Refresh Token (24h)
     * Inserta refresh token en whitelist (TBL_REFRESH_TOKEN)
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(
            @Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        verificarRateLimitIp(httpRequest);
        TokenResponse response = authService.login(request, httpRequest);
        resetearContadorIp(httpRequest); // login exitoso → limpiar contador IP
        return ResponseEntity.ok(ApiResponse.ok(response, "Autenticación exitosa"));
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

    /**
     * Recuperación de contraseña — POST /auth/recuperar-contrasena (público).
     * Genera clave temporal, actualiza en BD y envía email al correo registrado.
     * Siempre responde 200 OK aunque el usuario no exista (no revela datos).
     */
    @PostMapping("/recuperar-contrasena")
    public ResponseEntity<ApiResponse<String>> recuperarContrasena(
            @Valid @RequestBody RecuperarContrasenaRequest request) {
        String emailMasked = authService.recuperarContrasena(request);
        return ResponseEntity.ok(ApiResponse.ok(emailMasked,
                "Si el documento está registrado, recibirá una contraseña temporal en su correo."));
    }

    // ── Helpers rate limiting ────────────────────────────────────────────────

    private void verificarRateLimitIp(HttpServletRequest httpRequest) {
        String ip = obtenerIpCliente(httpRequest);
        long ahora = System.currentTimeMillis();
        long[] estado = IP_ATTEMPTS.compute(ip, (k, v) -> {
            if (v == null || (ahora - v[1]) > VENTANA_MS) return new long[]{1, ahora};
            return new long[]{v[0] + 1, v[1]};
        });
        if (estado[0] > MAX_IP_INTENTOS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiados intentos de acceso desde esta IP. Espere 1 minuto e intente de nuevo.");
        }
    }

    private void resetearContadorIp(HttpServletRequest httpRequest) {
        IP_ATTEMPTS.remove(obtenerIpCliente(httpRequest));
    }

    private static String obtenerIpCliente(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        return (ip != null && !ip.isBlank()) ? ip.split(",")[0].trim() : request.getRemoteAddr();
    }
}
