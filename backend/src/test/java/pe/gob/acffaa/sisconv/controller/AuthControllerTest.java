package pe.gob.acffaa.sisconv.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pe.gob.acffaa.sisconv.application.dto.request.LoginRequest;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.infrastructure.persistence.*;

import java.util.HashSet;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests de integración para AuthController — CU-27 | AF §8 M05
 * Usa H2 in-memory (perfil test), sin Oracle
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Auth Controller Integration Tests")
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JpaUsuarioRepository usuarioRepo;

    @Autowired
    private JpaRefreshTokenRepository refreshTokenRepository;

    @Autowired private JpaRolRepository rolRepo;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        refreshTokenRepository.deleteAll();
        
        usuarioRepo.deleteAll();
        rolRepo.deleteAll();

        Rol rolAdmin = rolRepo.save(Rol.builder()
                .codigoRol("ADMIN").nombreRol("Administrador").build());

        Usuario admin = Usuario.builder()
                .username("testadmin")
                .contrasenaHash(passwordEncoder.encode("Test@2025"))
                .nombres("Test").apellidos("Admin")
                .email("test@acffaa.gob.pe")
                .roles(new HashSet<>())
                .build();
        admin = usuarioRepo.save(admin);

        UsuarioRol ur = UsuarioRol.builder().usuario(admin).rol(rolAdmin).build();
        admin.getRoles().add(ur);
        usuarioRepo.save(admin);
    }

    @Test
    @DisplayName("POST /auth/login — Login exitoso retorna tokens JWT")
    void loginSuccess() throws Exception {
        LoginRequest request = new LoginRequest("testadmin", "Test@2025");
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
            .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
    }

    @Test
    @DisplayName("POST /auth/login — Credenciales inválidas retorna 401")
    void loginInvalidCredentials() throws Exception {
        LoginRequest request = new LoginRequest("testadmin", "ClaveIncorrecta");
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /auth/login — Username vacío retorna 400")
    void loginEmptyUsername() throws Exception {
        LoginRequest request = new LoginRequest("", "Test@2025");
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }
}
