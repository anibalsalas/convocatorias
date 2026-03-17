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
import org.springframework.test.web.servlet.MvcResult;
import pe.gob.acffaa.sisconv.application.dto.request.LoginRequest;
import pe.gob.acffaa.sisconv.application.dto.request.UsuarioRequest;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.infrastructure.persistence.*;

import java.util.HashSet;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests integración UsuarioController — SAD §5.2 RBAC
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Usuario Controller Integration Tests")
class UsuarioControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JpaUsuarioRepository usuarioRepo;

    @Autowired
    private JpaRefreshTokenRepository refreshTokenRepository;

    @Autowired private JpaRolRepository rolRepo;
    @Autowired private PasswordEncoder passwordEncoder;

    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        refreshTokenRepository.deleteAll();

        usuarioRepo.deleteAll();
        rolRepo.deleteAll();

        Rol rolAdmin = rolRepo.save(Rol.builder()
                .codigoRol("ADMIN").nombreRol("Administrador").build());
        rolRepo.save(Rol.builder()
                .codigoRol("ORH").nombreRol("Recursos Humanos").build());

        Usuario admin = Usuario.builder()
                .username("admin")
                .contrasenaHash(passwordEncoder.encode("Admin@2025"))
                .nombres("Admin").apellidos("Test")
                .email("admin_test@acffaa.gob.pe")
                .roles(new HashSet<>())
                .build();
        admin = usuarioRepo.save(admin);
        UsuarioRol ur = UsuarioRol.builder().usuario(admin).rol(rolAdmin).build();
        admin.getRoles().add(ur);
        usuarioRepo.save(admin);

        LoginRequest loginReq = new LoginRequest("admin", "Admin@2025");
        MvcResult result = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andReturn();
        adminToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();
               // .get("accessToken").asText();

    }   

    @Test
    @DisplayName("GET /admin/usuarios — ADMIN puede listar usuarios")
    void adminCanListUsers() throws Exception {
        mockMvc.perform(get("/admin/usuarios")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("POST /admin/usuarios — ADMIN puede crear usuario con roles")
    void adminCanCreateUser() throws Exception {
        UsuarioRequest req = new UsuarioRequest();
        req.setUsername("nuevo_orh");
        req.setPassword("Orh@2025!");
        req.setNombres("Juan");
        req.setApellidos("Pérez");
        req.setEmail("jperez@acffaa.gob.pe");
        req.setRolesCodigosRol(List.of("ORH"));

        mockMvc.perform(post("/admin/usuarios")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.username").value("nuevo_orh"))
            .andExpect(jsonPath("$.data.roles[0]").value("ORH"));
    }

    @Test
    @DisplayName("POST /admin/usuarios — Username duplicado retorna 400")
    void duplicateUsernameReturns400() throws Exception {
        UsuarioRequest req = new UsuarioRequest();
        req.setUsername("admin");
        req.setPassword("Otro@2025!");
        req.setNombres("Otro");
        req.setApellidos("Usuario");
        req.setEmail("otro@acffaa.gob.pe");

        mockMvc.perform(post("/admin/usuarios")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /admin/usuarios — Sin token retorna 403")
    void noTokenReturns403() throws Exception {
        mockMvc.perform(get("/admin/usuarios"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PATCH /admin/usuarios/{id}/desactivar — Desactiva usuario")
    void adminCanDeactivateUser() throws Exception {
        UsuarioRequest req = new UsuarioRequest();
        req.setUsername("para_desactivar");
        req.setPassword("Deact@2025!");
        req.setNombres("Para");
        req.setApellidos("Desactivar");
        req.setEmail("deact@acffaa.gob.pe");

        MvcResult createResult = mockMvc.perform(post("/admin/usuarios")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andReturn();

        Long userId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("data").get("idUsuario").asLong();

        mockMvc.perform(patch("/admin/usuarios/" + userId + "/desactivar")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estado").value("INACTIVO"));
    }
}
