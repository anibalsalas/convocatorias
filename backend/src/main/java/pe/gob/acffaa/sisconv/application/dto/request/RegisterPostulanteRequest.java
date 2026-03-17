package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * DTO Request para registro público de postulantes — ETAPA6 B1
 * Endpoint: POST /auth/register-postulante (público, sin JWT)
 * Username auto-derivado: {tipoDocumento}{numeroDocumento} → ej: DNI12345678
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class RegisterPostulanteRequest {

    @NotBlank(message = "Tipo de documento es obligatorio")
    @Pattern(regexp = "DNI|CE", message = "Tipo de documento debe ser DNI o CE")
    private String tipoDocumento;

    @NotBlank(message = "Número de documento es obligatorio")
    @Size(min = 8, max = 12, message = "Número de documento debe tener entre 8 y 12 caracteres")
    private String numeroDocumento;

    @NotBlank(message = "Nombres es obligatorio")
    @Size(max = 150, message = "Nombres no debe exceder 150 caracteres")
    private String nombres;

    @NotBlank(message = "Apellido paterno es obligatorio")
    @Size(max = 50, message = "Apellido paterno no debe exceder 100 caracteres")
    private String apellidoPaterno;

    @NotBlank(message = "Apellido materno es obligatorio")
    @Size(max = 50, message = "Apellido materno no debe exceder 100 caracteres")
    private String apellidoMaterno;

    @NotBlank(message = "Email es obligatorio")
    @Email(message = "Formato de email inválido")
    @Size(max = 200, message = "Email no debe exceder 200 caracteres")
    private String email;

    @Size(max = 20, message = "Teléfono no debe exceder 20 caracteres")
    private String telefono;

    @NotBlank(message = "Contraseña es obligatoria")
    @Size(min = 8, max = 100, message = "La contraseña debe tener entre 8 y 100 caracteres")
    private String password;

    @NotBlank(message = "Confirmación de contraseña es obligatoria")
    private String passwordConfirm;
}
