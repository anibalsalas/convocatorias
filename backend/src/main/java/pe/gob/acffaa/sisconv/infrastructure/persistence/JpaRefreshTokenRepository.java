package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.model.RefreshToken;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

/**
 * Implementación JPA para TBL_REFRESH_TOKEN
 */
public interface JpaRefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    List<RefreshToken> findByIdUsuario(Long idUsuario);

    long countByIdUsuario(Long idUsuario);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.token = :token")
    void deleteByToken(@Param("token") String token);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.idUsuario = :idUsuario")
    void deleteByIdUsuario(@Param("idUsuario") Long idUsuario);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.fechaExpiracion < :fecha")
    void deleteByFechaExpiracionBefore(@Param("fecha") LocalDateTime fecha);
}
