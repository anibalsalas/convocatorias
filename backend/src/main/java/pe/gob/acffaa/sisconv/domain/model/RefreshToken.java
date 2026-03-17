package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * TBL_REFRESH_TOKEN — Whitelist de sesiones activas
 * SAD §5.1 paso 5: "logout invalida el refresh token"
 * 
 * Patrón Whitelist:
 * - Login:   inserta registro (sesión activa)
 * - Refresh: valida que el token EXISTA en la tabla
 * - Logout:  elimina registro (sesión cerrada)
 * 
 * Si el token no está en la tabla → es inválido (revocado o inexistente)
 * Permite: revocar todas las sesiones de un usuario, auditar sesiones activas,
 * limitar sesiones simultáneas por usuarios.
 */
@Entity
@Table(name = "TBL_REFRESH_TOKEN")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_refresh_token")
    @SequenceGenerator(name = "seq_refresh_token", sequenceName = "SEQ_REFRESH_TOKEN", allocationSize = 1)
    @Column(name = "ID_REFRESH_TOKEN")
    private Long idRefreshToken;

    @Column(name = "ID_USUARIO", nullable = false)
    private Long idUsuario;

    @Column(name = "TOKEN", nullable = false, unique = true, length = 500)
    private String token;

    @Column(name = "IP_ORIGEN", length = 45)
    private String ipOrigen;

    @Column(name = "USER_AGENT", length = 500)
    private String userAgent;

    @Column(name = "FECHA_CREACION", nullable = false)
    @Builder.Default
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(name = "FECHA_EXPIRACION", nullable = false)
    private LocalDateTime fechaExpiracion;
}
