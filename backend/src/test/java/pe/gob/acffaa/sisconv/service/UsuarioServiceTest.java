package pe.gob.acffaa.sisconv.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.gob.acffaa.sisconv.application.dto.request.UsuarioUpdateRequest;
import pe.gob.acffaa.sisconv.application.dto.response.UsuarioResponse;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.service.UsuarioService;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.model.Rol;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.model.UsuarioRol;
import pe.gob.acffaa.sisconv.domain.repository.IRolRepository;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * UsuarioService — sincronización de roles sin violar UK (ID_USUARIO, ID_ROL).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UsuarioService")
class UsuarioServiceTest {

    @Mock
    private IUsuarioRepository usuarioRepo;
    @Mock
    private IRolRepository rolRepo;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private IAuditPort auditPort;

    @InjectMocks
    private UsuarioService service;

    @Test
    @DisplayName("actualizar: mismo rol ORH reutiliza fila existente (no segundo INSERT)")
    void actualizar_mismoRol_reutilizaFilaExistente() {
        Rol rolOrh = Rol.builder().idRol(2L).codigoRol("ORH").nombreRol("ORH").build();
        Usuario usuario = Usuario.builder()
                .idUsuario(13L)
                .username("pruebaorh")
                .email("orh@gmail.com")
                .nombres("A")
                .apellidos("B")
                .idArea(1L)
                .build();
        UsuarioRol ur = UsuarioRol.builder()
                .idUsuarioRol(100L)
                .usuario(usuario)
                .rol(rolOrh)
                .estado("ACTIVO")
                .build();
        usuario.getRoles().add(ur);

        when(usuarioRepo.findById(13L)).thenReturn(Optional.of(usuario));
        when(usuarioRepo.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(auditPort).registrar(anyString(), any(), anyString(), any(), anyString(), any(), any());

        UsuarioUpdateRequest req = new UsuarioUpdateRequest();
        req.setNombres("PRUEBA ORH");
        req.setApellidos("JARAMILLO");
        req.setEmail("orh@gmail.com");
        req.setIdArea(1L);
        req.setRolesCodigosRol(List.of("ORH"));

        UsuarioResponse res = service.actualizar(13L, req, null);

        assertEquals(List.of("ORH"), res.getRoles());
        assertEquals(1, usuario.getRoles().size());
        assertEquals("ACTIVO", ur.getEstado());
        verify(rolRepo, never()).findByCodigoRol(anyString());
        verify(usuarioRepo).save(usuario);
    }

    @Test
    @DisplayName("actualizar: rol estaba INACTIVO se reactiva sin nueva fila")
    void actualizar_rolInactivo_seReactiva() {
        Rol rolOrh = Rol.builder().idRol(2L).codigoRol("ORH").nombreRol("ORH").build();
        Usuario usuario = Usuario.builder()
                .idUsuario(13L)
                .username("pruebaorh")
                .email("orh@gmail.com")
                .nombres("A")
                .apellidos("B")
                .idArea(1L)
                .build();
        UsuarioRol ur = UsuarioRol.builder()
                .idUsuarioRol(100L)
                .usuario(usuario)
                .rol(rolOrh)
                .estado("INACTIVO")
                .build();
        usuario.getRoles().add(ur);

        when(usuarioRepo.findById(13L)).thenReturn(Optional.of(usuario));
        when(usuarioRepo.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(auditPort).registrar(anyString(), any(), anyString(), any(), anyString(), any(), any());

        UsuarioUpdateRequest req = new UsuarioUpdateRequest();
        req.setNombres("X");
        req.setApellidos("Y");
        req.setEmail("orh@gmail.com");
        req.setIdArea(1L);
        req.setRolesCodigosRol(List.of("ORH"));

        UsuarioResponse res = service.actualizar(13L, req, null);

        assertEquals(List.of("ORH"), res.getRoles());
        assertEquals("ACTIVO", ur.getEstado());
        assertEquals(1, usuario.getRoles().size());
        verify(rolRepo, never()).findByCodigoRol(anyString());
    }

    @Test
    @DisplayName("actualizar: cambia de ORH a OPP desactiva ORH y activa OPP (una fila por rol)")
    void actualizar_cambiaRol_sinDuplicar() {
        Rol rolOrh = Rol.builder().idRol(2L).codigoRol("ORH").nombreRol("ORH").build();
        Rol rolOpp = Rol.builder().idRol(3L).codigoRol("OPP").nombreRol("OPP").build();
        Usuario usuario = Usuario.builder()
                .idUsuario(13L)
                .username("u1")
                .email("e@e.com")
                .nombres("A")
                .apellidos("B")
                .idArea(1L)
                .build();
        UsuarioRol urOrh = UsuarioRol.builder().idUsuarioRol(1L).usuario(usuario).rol(rolOrh).estado("ACTIVO").build();
        usuario.getRoles().add(urOrh);

        when(usuarioRepo.findById(13L)).thenReturn(Optional.of(usuario));
        when(usuarioRepo.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(rolRepo.findByCodigoRol("OPP")).thenReturn(Optional.of(rolOpp));
        doNothing().when(auditPort).registrar(anyString(), any(), anyString(), any(), anyString(), any(), any());

        UsuarioUpdateRequest req = new UsuarioUpdateRequest();
        req.setNombres("A");
        req.setApellidos("B");
        req.setEmail("e@e.com");
        req.setIdArea(1L);
        req.setRolesCodigosRol(List.of("OPP"));

        UsuarioResponse res = service.actualizar(13L, req, null);

        assertEquals(List.of("OPP"), res.getRoles());
        assertEquals("INACTIVO", urOrh.getEstado());
        assertEquals(2, usuario.getRoles().size());
        UsuarioRol urOpp = usuario.getRoles().stream()
                .filter(x -> "OPP".equals(x.getRol().getCodigoRol()))
                .findFirst().orElseThrow();
        assertEquals("ACTIVO", urOpp.getEstado());
        verify(rolRepo).findByCodigoRol("OPP");
        verify(rolRepo, never()).findByCodigoRol("ORH");
    }

    @Test
    @DisplayName("actualizar: email ya usado por otro usuario lanza DomainException")
    void actualizar_emailDuplicadoOtroUsuario_lanza() {
        Usuario usuario = Usuario.builder()
                .idUsuario(13L)
                .username("u1")
                .email("old@x.com")
                .nombres("A")
                .apellidos("B")
                .idArea(1L)
                .build();
        Usuario otro = Usuario.builder().idUsuario(99L).username("otro").build();

        when(usuarioRepo.findById(13L)).thenReturn(Optional.of(usuario));
        when(usuarioRepo.findByEmail("nuevo@x.com")).thenReturn(Optional.of(otro));

        UsuarioUpdateRequest req = new UsuarioUpdateRequest();
        req.setNombres("A");
        req.setApellidos("B");
        req.setEmail("nuevo@x.com");
        req.setIdArea(1L);
        req.setRolesCodigosRol(List.of("ORH"));

        assertThrows(DomainException.class, () -> service.actualizar(13L, req, null));
        verify(usuarioRepo, never()).save(any());
    }
}
