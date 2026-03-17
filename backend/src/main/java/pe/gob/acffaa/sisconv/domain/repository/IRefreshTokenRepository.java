package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.RefreshToken;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

/**
 * Puerto de repositorio para RefreshToken — SAD §3.3 SOLID-D
 * Whitelist pattern: solo tokens presentes en tabla son válidos
 */
public interface IRefreshTokenRepository {

    /** Buscar token activo en whitelist */
    Optional<RefreshToken> findByToken(String token);

    /** Guardar nuevo token (login) */
    RefreshToken save(RefreshToken refreshToken);

    /** Eliminar token específico (logout) */
    void deleteByToken(String token);

    /** Revocar TODAS las sesiones de un usuario (seguridad) */
    void deleteByIdUsuario(Long idUsuario);

    /** Listar sesiones activas de un usuario (auditoría) */
    List<RefreshToken> findByIdUsuario(Long idUsuario);

    /** Limpiar tokens expirados (mantenimiento) */
    void deleteByFechaExpiracionBefore(LocalDateTime fecha);

    /** Contar sesiones activas de un usuario */
    long countByIdUsuario(Long idUsuario);
}
