package pe.gob.acffaa.sisconv.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import pe.gob.acffaa.sisconv.infrastructure.security.JwtTokenProvider;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests unitarios para JwtTokenProvider — CU-27 | SAD §5.1
 */
@DisplayName("JWT Token Provider Tests")
class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "jwtSecret",
            "test-secret-key-sisconv-acffaa-2025-min-256-bits-for-unit-testing-only");
        ReflectionTestUtils.setField(tokenProvider, "accessTokenExpiration", 1800000L);
        ReflectionTestUtils.setField(tokenProvider, "refreshTokenExpiration", 86400000L);
        ReflectionTestUtils.setField(tokenProvider, "issuer", "SISCONV-TEST");
        tokenProvider.init();
    }

    @Test
    @DisplayName("Debe generar access token válido con roles")
    void shouldGenerateValidAccessToken() {
        Authentication auth = createAuth("admin", "ROLE_ADMIN");
        String token = tokenProvider.generateAccessToken(auth);
        assertNotNull(token);
        assertTrue(tokenProvider.validateToken(token));
        assertEquals("admin", tokenProvider.getUsernameFromToken(token));
    }

    @Test
    @DisplayName("Debe generar refresh token válido")
    void shouldGenerateValidRefreshToken() {
        String token = tokenProvider.generateRefreshToken("admin");
        assertNotNull(token);
        assertTrue(tokenProvider.validateToken(token));
        assertEquals("admin", tokenProvider.getUsernameFromToken(token));
    }

    @Test
    @DisplayName("Debe rechazar token inválido")
    void shouldRejectInvalidToken() {
        assertFalse(tokenProvider.validateToken("token.invalido.aqui"));
        assertFalse(tokenProvider.validateToken(""));
        assertFalse(tokenProvider.validateToken(null));
    }

    @Test
    @DisplayName("Debe rechazar token expirado")
    void shouldRejectExpiredToken() {
        ReflectionTestUtils.setField(tokenProvider, "accessTokenExpiration", 1L);
        Authentication auth = createAuth("admin", "ROLE_ADMIN");
        String token = tokenProvider.generateAccessToken(auth);
        try { Thread.sleep(50); } catch (InterruptedException ignored) {}
        assertFalse(tokenProvider.validateToken(token));
    }

    @Test
    @DisplayName("Debe extraer username correctamente")
    void shouldExtractUsername() {
        Authentication auth = createAuth("usuario_orh", "ROLE_ORH");
        String token = tokenProvider.generateAccessToken(auth);
        assertEquals("usuario_orh", tokenProvider.getUsernameFromToken(token));
    }

    private Authentication createAuth(String username, String role) {
        var authorities = List.of(new SimpleGrantedAuthority(role));
        return new UsernamePasswordAuthenticationToken(username, null, authorities);
    }
}
