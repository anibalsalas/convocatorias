package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.time.LocalDate;

/**
 * DTO Response para perfil del postulante — Mi Perfil / Datos Personales
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostulantePerfilResponse {
    private Long idPostulante;
    private String tipoDocumento;
    private String numeroDocumento;
    private String nombres;
    private String apellidoPaterno;
    private String apellidoMaterno;
    private LocalDate fechaNacimiento;
    private String genero;
    private String estadoCivil;
    private String telefono;
    private String telefonoFijo;
    private String email;
    private String direccion;
    private String ubigeo;
    private String ruc;
    private String nroBrevete;
    private String categoriaBrevete;
    private Boolean tieneColegiatura;
    private Boolean tieneHabilitacionProf;
    private String nroColegiatura;
    private Boolean estaEnRedam;
    private Boolean estaEnRnssc;
    private Boolean estaEnRedereci;
    private Boolean tieneAntecedentesPenales;
    private Boolean tieneAntecedentesPoliciales;
    private Boolean tieneAntecedentesJudiciales;
    private Boolean aceptaDeclaracionJurada;
    private String detalleDeclaracionJurada;
    private Boolean esLicenciadoFfaa;
    private Boolean esPersonaDiscap;
    private Boolean esDeportistaDest;
    private String estado;
}