package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.domain.repository.*;
import pe.gob.acffaa.sisconv.infrastructure.security.JwtTokenProvider;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Servicio de autenticación — AF §8 M05 | SAD §5.1: Flujo JWT completo 5 pasos
 *
 * Flujo con Whitelist (TBL_REFRESH_TOKEN):
 *   (1) Login   → genera Access + Refresh, INSERTA refresh en whitelist
 *   (2) Request → Bearer accessToken en cada petición
 *   (3) Filter  → JwtAuthenticationFilter valida y carga SecurityContext
 *   (4) Refresh → valida que refresh token EXISTA en whitelist, rota tokens
 *   (5) Logout  → ELIMINA refresh token de whitelist (invalidación server-side)
 *
 * SAD §3.1 Capa 2 (Application): Orquesta lógica, depende solo de Domain + puertos
 */
@Service
public class AuthService {

    private final AuthenticationManager authManager;
    private final JwtTokenProvider tokenProvider;
    private final IUsuarioRepository usuarioRepository;
    private final IRefreshTokenRepository refreshTokenRepository;
    private final IRolRepository rolRepository;
    private final IPostulanteRepository postulanteRepository;
    private final PasswordEncoder passwordEncoder;
    private final IAuditPort auditPort;

    public AuthService(AuthenticationManager authManager, JwtTokenProvider tokenProvider,
                       IUsuarioRepository usuarioRepository,
                       IRefreshTokenRepository refreshTokenRepository,
                       IRolRepository rolRepository,
                       IPostulanteRepository postulanteRepository,
                       PasswordEncoder passwordEncoder,
                       IAuditPort auditPort) {
        this.authManager = authManager;
        this.tokenProvider = tokenProvider;
        this.usuarioRepository = usuarioRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.rolRepository = rolRepository;
        this.postulanteRepository = postulanteRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditPort = auditPort;
    }

    /**
     * SAD §5.1 Paso 1: Login → genera Access Token + Refresh Token
     * Inserta refresh token en whitelist (TBL_REFRESH_TOKEN)
     */
    @Transactional
    public TokenResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        String accessToken = tokenProvider.generateAccessToken(auth);
        String refreshToken = tokenProvider.generateRefreshToken(auth.getName());

        Usuario usuario = usuarioRepository.findByUsername(auth.getName()).orElse(null);

        if (usuario != null) {
            // Actualizar último acceso
            usuario.setUltimoAcceso(LocalDateTime.now());
            usuarioRepository.save(usuario);

            // Whitelist: Insertar refresh token en TBL_REFRESH_TOKEN
            RefreshToken rtEntity = RefreshToken.builder()
                    .idUsuario(usuario.getIdUsuario())
                    .token(refreshToken)
                    .ipOrigen(obtenerIp(httpRequest))
                    .userAgent(httpRequest != null ? httpRequest.getHeader("User-Agent") : null)
                    .fechaExpiracion(LocalDateTime.now().plusHours(24))
                    .build();
            refreshTokenRepository.save(rtEntity);
        }

        // Auditoría D.L. 1451
        auditPort.registrar("TBL_USUARIO",
                usuario != null ? usuario.getIdUsuario() : null,
                "LOGIN", null, "AUTENTICADO", httpRequest, null);

        var roles = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).collect(Collectors.toList());

        String nombreCompleto = (usuario != null)
                ? usuario.getNombres() + " " + usuario.getApellidos() : auth.getName();

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getAccessTokenExpiration() / 1000)
                .username(auth.getName())
                .nombreCompleto(nombreCompleto)
                .roles(roles)
                .build();
    }

    /**
     * SAD §5.1 Paso 4: Refresh → valida whitelist, rota tokens
     * Si refresh token NO existe en TBL_REFRESH_TOKEN → rechazado (revocado)
     */
    @Transactional
    public TokenResponse refreshToken(RefreshTokenRequest request, HttpServletRequest httpRequest) {
        String oldToken = request.getRefreshToken();

        // 1. Validar firma JWT
        if (!tokenProvider.validateToken(oldToken)) {
            throw new DomainException("Refresh token inválido o expirado (firma JWT)");
        }

        // 2. Validar existencia en whitelist
        RefreshToken existingToken = refreshTokenRepository.findByToken(oldToken)
                .orElseThrow(() -> new DomainException(
                        "Refresh token revocado o no encontrado en whitelist"));

        // 3. Eliminar token viejo (rotación)
        refreshTokenRepository.deleteByToken(oldToken);

        // 4. Generar nuevo par de tokens
        String username = tokenProvider.getUsernameFromToken(oldToken);
        var userDetails = new org.springframework.security.core.userdetails.User(
                username, "", java.util.Collections.emptyList());
        var auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

        String newAccessToken = tokenProvider.generateAccessToken(auth);
        String newRefreshToken = tokenProvider.generateRefreshToken(username);

        // 5. Insertar nuevo refresh en whitelist
        RefreshToken newRtEntity = RefreshToken.builder()
                .idUsuario(existingToken.getIdUsuario())
                .token(newRefreshToken)
                .ipOrigen(obtenerIp(httpRequest))
                .userAgent(httpRequest != null ? httpRequest.getHeader("User-Agent") : null)
                .fechaExpiracion(LocalDateTime.now().plusHours(24))
                .build();
        refreshTokenRepository.save(newRtEntity);

        return TokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getAccessTokenExpiration() / 1000)
                .username(username)
                .build();
    }

    /**
     * SAD §5.1 Paso 5: "Logout invalida el refresh token"
     * ELIMINA de whitelist → token ya no es válido para /auth/refresh
     */
    @Transactional
    public void logout(String refreshToken, HttpServletRequest httpRequest) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenRepository.deleteByToken(refreshToken);
        }

        String username = "DESCONOCIDO";
        try {
            if (refreshToken != null && tokenProvider.validateToken(refreshToken)) {
                username = tokenProvider.getUsernameFromToken(refreshToken);
            }
        } catch (Exception ignored) {}

        auditPort.registrar("TBL_USUARIO", null, "LOGOUT",
                "AUTENTICADO", "DESCONECTADO", httpRequest, "Usuario: " + username);
    }

    /**
     * Revocar TODAS las sesiones de un usuario (seguridad: cuenta comprometida)
     */
    @Transactional
    public void revocarTodasLasSesiones(Long idUsuario) {
        refreshTokenRepository.deleteByIdUsuario(idUsuario);
    }

    /**
     * ETAPA6 B3: Registro público de postulante con auto-login
     * 1. Valida duplicados (username, email, documento)
     * 2. Crea Usuario con BCrypt + asigna ROLE_POSTULANTE
     * 3. Crea Postulante vinculado
     * 4. Genera JWT (auto-login) → retorna TokenResponse
     */
  @Transactional
public TokenResponse registerPostulante(RegisterPostulanteRequest req, HttpServletRequest httpRequest) {

    // ✅ Normalización (MAYÚSCULAS para datos personales)
    final String tipoDoc = normalizeUpper(req.getTipoDocumento());
    final String numDoc  = normalizeUpper(req.getNumeroDocumento());
    final String nombres = normalizeUpper(req.getNombres());
    final String apePat  = normalizeUpper(req.getApellidoPaterno());
    final String apeMat  = normalizeUpper(req.getApellidoMaterno());
    final String email   = normalizeLower(req.getEmail());
    final String telefono = (req.getTelefono() != null && !req.getTelefono().trim().isBlank())
            ? req.getTelefono().trim()
            : null;

    // ✅ Validación negocio: documento por tipo
    validarDocumentoPorTipo(tipoDoc, numDoc);

    // Validar password match
    if (!req.getPassword().equals(req.getPasswordConfirm())) {
        throw new DomainException("Las contraseñas no coinciden");
    }

    // Username auto-derivado: DNI12345678
    String username = tipoDoc + numDoc;

    // Validar unicidad
    if (usuarioRepository.findByUsername(username).isPresent()) {
        throw new DomainException("Ya existe una cuenta registrada con este documento");
    }
    if (usuarioRepository.findByEmail(email).isPresent()) {
        throw new DomainException("Ya existe una cuenta registrada con este email");
    }
    if (postulanteRepository.findByTipoDocumentoAndNumeroDocumento(tipoDoc, numDoc).isPresent()) {
        throw new DomainException("Ya existe un postulante con este documento");
    }

    // Buscar rol POSTULANTE
    Rol rolPostulante = rolRepository.findByCodigoRol("POSTULANTE")
            .orElseThrow(() -> new DomainException("Rol POSTULANTE no encontrado en BD"));

    // Crear Usuario (apellidos concatenados)
    String apellidosCompletos = apePat + " " + apeMat;

    Usuario usuario = Usuario.builder()
            .username(username)
            .contrasenaHash(passwordEncoder.encode(req.getPassword()))
            .nombres(nombres)              // ✅ MAYÚSCULAS
            .apellidos(apellidosCompletos) // ✅ MAYÚSCULAS
            .email(email)                  // ✅ normalizado
            .estado("ACTIVO")
            .fechaCreacion(LocalDateTime.now())
            .ultimoAcceso(LocalDateTime.now())
            .build();

    UsuarioRol usuarioRol = UsuarioRol.builder()
            .usuario(usuario)
            .rol(rolPostulante)
            .fechaAsignacion(LocalDateTime.now())
            .estado("ACTIVO")
            .build();
    usuario.getRoles().add(usuarioRol);
    usuario = usuarioRepository.save(usuario);

    // Crear Postulante vinculado
    Postulante postulante = Postulante.builder()
            .tipoDocumento(tipoDoc)    // ✅ MAYÚSCULAS
            .numeroDocumento(numDoc)   // ✅ MAYÚSCULAS
            .nombres(nombres)          // ✅ MAYÚSCULAS
            .apellidoPaterno(apePat)   // ✅ MAYÚSCULAS
            .apellidoMaterno(apeMat)   // ✅ MAYÚSCULAS
            .email(email)
            .telefono(telefono)
            .usuario(usuario)
            .estado("ACTIVO")
            .fechaCreacion(LocalDateTime.now())
            .usuarioCreacion(username)
            .build();
    postulanteRepository.save(postulante);

    // Auto-login: generar JWT
    Authentication auth = authManager.authenticate(
            new UsernamePasswordAuthenticationToken(username, req.getPassword()));

    String accessToken = tokenProvider.generateAccessToken(auth);
    String refreshToken = tokenProvider.generateRefreshToken(username);

    RefreshToken rtEntity = RefreshToken.builder()
            .idUsuario(usuario.getIdUsuario())
            .token(refreshToken)
            .ipOrigen(obtenerIp(httpRequest))
            .userAgent(httpRequest != null ? httpRequest.getHeader("User-Agent") : null)
            .fechaExpiracion(LocalDateTime.now().plusHours(24))
            .build();
    refreshTokenRepository.save(rtEntity);

    auditPort.registrar("TBL_USUARIO", usuario.getIdUsuario(),
            "REGISTER", null, "REGISTRADO", httpRequest,
            "Auto-registro postulante: " + username);

    return TokenResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresIn(tokenProvider.getAccessTokenExpiration() / 1000)
            .username(username)
            .nombreCompleto(nombres + " " + apePat + " " + apeMat) // ✅ MAYÚSCULAS
            .roles(List.of("ROLE_POSTULANTE"))
            .build();
}

private static String normalizeUpper(String value) {
    return value == null ? null : value.trim().toUpperCase(java.util.Locale.ROOT);
}

private static String normalizeLower(String value) {
    return value == null ? null : value.trim().toLowerCase(java.util.Locale.ROOT);
}

private static void validarDocumentoPorTipo(String tipoDocumento, String numeroDocumento) {
    if ("DNI".equals(tipoDocumento)) {
        if (!numeroDocumento.matches("\\d{8}")) {
            throw new DomainException("DNI debe tener exactamente 8 dígitos");
        }
        return;
    }
    if ("CE".equals(tipoDocumento)) {
        if (!numeroDocumento.matches("[A-Z0-9]{8,12}")) {
            throw new DomainException("CE debe ser alfanumérico (8 a 12 caracteres)");
        }
        return;
    }
    throw new DomainException("Tipo de documento debe ser DNI o CE");
}

    private String obtenerIp(HttpServletRequest request) {
        if (request == null) return "0.0.0.0";
        String ip = request.getHeader("X-Forwarded-For");
        return (ip != null) ? ip.split(",")[0].trim() : request.getRemoteAddr();
    }
}
