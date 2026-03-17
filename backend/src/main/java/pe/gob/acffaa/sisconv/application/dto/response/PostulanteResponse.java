package pe.gob.acffaa.sisconv.application.dto.response;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PostulanteResponse {
    private Long idPostulante;
    private String tipoDocumento;
    private String numeroDocumento;
    private String nombreCompleto;
    private String email;
    private String genero;
    private String estado;
    private Boolean esLicenciadoFfaa;
    private Boolean esPersonaDiscap;
    private Boolean esDeportistaDest;
}
