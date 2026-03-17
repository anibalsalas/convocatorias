package pe.gob.acffaa.sisconv.application.dto.request;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PostulacionRequest {
    @NotNull private Long idConvocatoria;
    private Long idPerfilPuesto;
    @NotBlank private String tipoDocumento;
    @NotBlank private String numeroDocumento;
    @NotBlank private String nombres;
    @NotBlank private String apellidoPaterno;
    private String apellidoMaterno;
    private String email;
    private String telefono;
    private String genero;
    private LocalDate fechaNacimiento;
    private String direccion;
    private String ubigeo;
    private Boolean esLicenciadoFfaa;
    private Boolean esPersonaDiscap;
    private Boolean esDeportistaDest;
    @NotNull @Size(min = 3, max = 3) private List<DdjjItem> declaracionesJuradas;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DdjjItem {
        @NotBlank private String tipoDeclaracion;
        @NotNull private Boolean aceptada;
    }
}
