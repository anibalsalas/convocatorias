package pe.gob.acffaa.sisconv.infrastructure.persistence;

import jakarta.transaction.Transactional;
import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.RefreshToken;
import pe.gob.acffaa.sisconv.domain.repository.IRefreshTokenRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

/**
 * Adapter: conecta IRefreshTokenRepository (domain) con JPA (infrastructure)
 * SAD §3.3 SOLID-D: Dependency Inversion
 */
@Repository
@Transactional
public class RefreshTokenRepositoryAdapter implements IRefreshTokenRepository {

    private final JpaRefreshTokenRepository jpa;

    public RefreshTokenRepositoryAdapter(JpaRefreshTokenRepository jpa) {
        this.jpa = jpa;
    }

    @Override public Optional<RefreshToken> findByToken(String token) { return jpa.findByToken(token); }
    @Override public RefreshToken save(RefreshToken refreshToken) { return jpa.save(refreshToken); }
    @Override public void deleteByToken(String token) { jpa.deleteByToken(token); }
    @Override public void deleteByIdUsuario(Long idUsuario) { jpa.deleteByIdUsuario(idUsuario); }
    @Override public List<RefreshToken> findByIdUsuario(Long idUsuario) { return jpa.findByIdUsuario(idUsuario); }
    @Override public void deleteByFechaExpiracionBefore(LocalDateTime fecha) { jpa.deleteByFechaExpiracionBefore(fecha); }
    @Override public long countByIdUsuario(Long idUsuario) { return jpa.countByIdUsuario(idUsuario); }
}
