package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO Response para usuarios — Sin hash de contraseña (SAD §9.1 Capa 7: Protección datos)
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsuarioResponse {
    private Long idUsuario;
    private String username;
    private String nombres;
    private String apellidos;
    private String email;
    private Long idArea;
    private String estado;
    private LocalDateTime ultimoAcceso;
    private LocalDateTime fechaCreacion;
    private List<String> roles;
}
