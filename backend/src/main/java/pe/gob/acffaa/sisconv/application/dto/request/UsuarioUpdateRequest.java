package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;

/**
 * DTO Request para actualización de usuarios — AF §8 M10: PUT /admin/usuarios/{id}
 * Username y password NO son editables (identidad + seguridad).
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class UsuarioUpdateRequest {

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
