package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import pe.gob.acffaa.sisconv.application.dto.request.UsuarioRequest;
import pe.gob.acffaa.sisconv.application.dto.request.UsuarioUpdateRequest;
import pe.gob.acffaa.sisconv.application.dto.response.UsuarioResponse;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.domain.repository.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Servicio de gestión de usuarios — SAD §3.1 Capa 2 (Application)
 * SAD §3.3 SOLID-S: Solo orquesta lógica de usuarios, no gestiona notificaciones ni auditoría directa
 * SAD §3.3 SOLID-D: Depende de IUsuarioRepository (interface), no de implementación JPA
 */
@Service
public class UsuarioService {

    private final IUsuarioRepository usuarioRepo;
    private final IRolRepository rolRepo;
    private final PasswordEncoder passwordEncoder;
    private final IAuditPort auditPort;

    public UsuarioService(IUsuarioRepository usuarioRepo, IRolRepository rolRepo,
                          PasswordEncoder passwordEncoder, IAuditPort auditPort) {
        this.usuarioRepo = usuarioRepo;
        this.rolRepo = rolRepo;
        this.passwordEncoder = passwordEncoder;
        this.auditPort = auditPort;
    }

    public List<UsuarioResponse> listarActivos() {
        return usuarioRepo.findAllActive().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<UsuarioResponse> listarTodos() {
        return usuarioRepo.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public UsuarioResponse obtenerPorId(Long id) {
        return toResponse(usuarioRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id)));
    }

    @Transactional
    public UsuarioResponse crear(UsuarioRequest req, HttpServletRequest httpReq) {
        if (usuarioRepo.existsByUsername(req.getUsername())) {
            throw new DomainException("Username ya existe: " + req.getUsername());
        }
        if (usuarioRepo.existsByEmail(req.getEmail())) {
            throw new DomainException("Email ya registrado: " + req.getEmail());
        }

        Usuario usuario = Usuario.builder()
                .username(req.getUsername())
                .contrasenaHash(passwordEncoder.encode(req.getPassword()))
                .nombres(req.getNombres())
                .apellidos(req.getApellidos())
                .email(req.getEmail())
                .idArea(req.getIdArea())
                .build();
        usuario = usuarioRepo.save(usuario);

        // Asignar roles
        if (req.getRolesCodigosRol() != null) {
            for (String codigoRol : req.getRolesCodigosRol()) {
                Rol rol = rolRepo.findByCodigoRol(codigoRol)
                        .orElseThrow(() -> new DomainException("Rol no encontrado: " + codigoRol));
                UsuarioRol ur = UsuarioRol.builder().usuario(usuario).rol(rol).build();
                usuario.getRoles().add(ur);
            }
            usuario = usuarioRepo.save(usuario);
        }

        // Auditoría — D.L. 1451
        auditPort.registrar("TBL_USUARIO", usuario.getIdUsuario(), "CREAR",
                null, "ACTIVO", httpReq, "Roles: " + req.getRolesCodigosRol());

        return toResponse(usuario);
    }

    @Transactional
    public UsuarioResponse actualizar(Long id, UsuarioUpdateRequest req, HttpServletRequest httpReq) {
        Usuario usuario = usuarioRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));

        usuario.setNombres(req.getNombres());
        usuario.setApellidos(req.getApellidos());
        usuario.setEmail(req.getEmail());
        usuario.setIdArea(req.getIdArea());

        // Desactivar roles actuales y reasignar
        if (usuario.getRoles() != null) {
            usuario.getRoles().forEach(ur -> ur.setEstado("INACTIVO"));
        }
        if (req.getRolesCodigosRol() != null) {
            for (String codigoRol : req.getRolesCodigosRol()) {
                Rol rol = rolRepo.findByCodigoRol(codigoRol)
                        .orElseThrow(() -> new DomainException("Rol no encontrado: " + codigoRol));
                UsuarioRol ur = UsuarioRol.builder().usuario(usuario).rol(rol).build();
                usuario.getRoles().add(ur);
            }
        }

        usuario = usuarioRepo.save(usuario);
        auditPort.registrar("TBL_USUARIO", id, "ACTUALIZAR",
                null, usuario.getEstado(), httpReq, "Roles: " + req.getRolesCodigosRol());
        return toResponse(usuario);
    }

    @Transactional
    public UsuarioResponse activar(Long id, HttpServletRequest httpReq) {
        Usuario usuario = usuarioRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
        String estadoAnterior = usuario.getEstado();
        usuario.setEstado("ACTIVO");
        usuarioRepo.save(usuario);
        auditPort.registrar("TBL_USUARIO", id, "ACTIVAR",
                estadoAnterior, "ACTIVO", httpReq, null);
        return toResponse(usuario);
    }

    @Transactional
    public UsuarioResponse desactivar(Long id, HttpServletRequest httpReq) {
        Usuario usuario = usuarioRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
        String estadoAnterior = usuario.getEstado();
        usuario.setEstado("INACTIVO");
        usuarioRepo.save(usuario);

        auditPort.registrar("TBL_USUARIO", id, "DESACTIVAR",
                estadoAnterior, "INACTIVO", httpReq, null);

        return toResponse(usuario);
    }

    private UsuarioResponse toResponse(Usuario u) {
        List<String> roles = (u.getRoles() != null) ?
                u.getRoles().stream()
                        .filter(ur -> "ACTIVO".equals(ur.getEstado()))
                        .map(ur -> ur.getRol().getCodigoRol())
                        .collect(Collectors.toList()) :
                List.of();

        return UsuarioResponse.builder()
                .idUsuario(u.getIdUsuario())
                .username(u.getUsername())
                .nombres(u.getNombres())
                .apellidos(u.getApellidos())
                .email(u.getEmail())
                .idArea(u.getIdArea())
                .estado(u.getEstado())
                .ultimoAcceso(u.getUltimoAcceso())
                .fechaCreacion(u.getFechaCreacion())
                .roles(roles)
                .build();
    }
}
