package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;

/**
 * DTO Request para creación de usuarios — AF §8 M10: POST /admin/usuarios
 * SAD §9.1 Capa 4: Bean Validation (@NotBlank, @Size, @Email)
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class UsuarioRequest {
    @NotBlank(message = "Username es obligatorio")
    @Size(min = 4, max = 50, message = "Username debe tener entre 4 y 50 caracteres")
    private String username;

    @NotBlank(message = "Contraseña es obligatoria")
    @Size(min = 8, message = "La contraseña debe tener mínimo 8 caracteres")
    private String password;

    @NotBlank(message = "Nombres es obligatorio")
    private String nombres;

    @NotBlank(message = "Apellidos es obligatorio")
    private String apellidos;

    @NotBlank(message = "Email es obligatorio")
    @Email(message = "Formato de email inválido")
    private String email;

    private Long idArea;

    private List<String> rolesCodigosRol;
}
