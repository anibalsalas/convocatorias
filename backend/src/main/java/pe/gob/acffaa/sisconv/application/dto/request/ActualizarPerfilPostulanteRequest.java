package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;

/**
 * DTO Request para actualizar perfil del postulante — Mi Perfil / Datos Personales
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActualizarPerfilPostulanteRequest {

    @NotBlank(message = "Nombres es obligatorio")
    @Size(max = 150, message = "Nombres no debe exceder 150 caracteres")
    private String nombres;

    @NotBlank(message = "Apellido paterno es obligatorio")
    @Size(max = 100, message = "Apellido paterno no debe exceder 100 caracteres")
    private String apellidoPaterno;

    @NotBlank(message = "Apellido materno es obligatorio")
    @Size(max = 100, message = "Apellido materno no debe exceder 100 caracteres")
    private String apellidoMaterno;

    @NotNull(message = "Fecha de nacimiento es obligatoria")
    private LocalDate fechaNacimiento;

    @NotBlank(message = "Estado civil es obligatorio")
    @Size(max = 20, message = "Estado civil no debe exceder 20 caracteres")
    private String estadoCivil;

    @NotBlank(message = "Sexo es obligatorio")
    @Size(max = 1, message = "Sexo debe ser un carácter (M/F/O)")
    private String genero;

    @NotBlank(message = "Teléfono celular es obligatorio")
    @Size(max = 20, message = "Teléfono celular no debe exceder 20 caracteres")
    private String telefono;

    @Size(max = 20, message = "Teléfono fijo no debe exceder 20 caracteres")
    private String telefonoFijo;

    @NotBlank(message = "Email es obligatorio")
    @Email(message = "Formato de email inválido")
    @Size(max = 200, message = "Email no debe exceder 200 caracteres")
    private String email;

    @NotBlank(message = "Dirección es obligatoria")
    @Size(max = 500, message = "Dirección no debe exceder 500 caracteres")
    private String direccion;

    @NotBlank(message = "Ubigeo es obligatorio")
    @Size(min = 6, max = 6, message = "Ubigeo debe tener 6 caracteres")
    private String ubigeo;

    @NotBlank(message = "RUC es obligatorio")
    @Pattern(regexp = "\\d{11}", message = "RUC debe tener 11 dígitos")
    private String ruc;

    @Size(max = 20, message = "Nro. de brevete no debe exceder 20 caracteres")
    private String nroBrevete;

    @NotBlank(message = "Categoría es obligatoria")
    @Size(max = 30, message = "Categoría no debe exceder 30 caracteres")
    private String categoriaBrevete;

    @NotNull(message = "Debe indicar si cuenta con colegiatura")
    private Boolean tieneColegiatura;

    @NotNull(message = "Debe indicar si cuenta con habilitación profesional")
    private Boolean tieneHabilitacionProf;

    @Size(max = 50, message = "Nro. de colegiatura no debe exceder 50 caracteres")
    private String nroColegiatura;

    @NotNull(message = "Debe indicar situación REDAM")
    private Boolean estaEnRedam;

    @NotNull(message = "Debe indicar situación RNSSC")
    private Boolean estaEnRnssc;

    @NotNull(message = "Debe indicar situación REDERECI")
    private Boolean estaEnRedereci;

    @NotNull(message = "Debe indicar antecedentes penales")
    private Boolean tieneAntecedentesPenales;

    @NotNull(message = "Debe indicar antecedentes policiales")
    private Boolean tieneAntecedentesPoliciales;

    @NotNull(message = "Debe indicar antecedentes judiciales")
    private Boolean tieneAntecedentesJudiciales;

    @NotNull(message = "Debe indicar si acepta la declaración jurada")
    private Boolean aceptaDeclaracionJurada;

    @Size(max = 2000, message = "El detalle de declaración jurada no debe exceder 2000 caracteres")
    private String detalleDeclaracionJurada;

    private Boolean esLicenciadoFfaa;
    private Boolean esPersonaDiscap;
    private Boolean esDeportistaDest;
}