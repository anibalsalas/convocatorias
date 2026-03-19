package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;
import java.util.List;

/**
 * E11 Request — POST /convocatorias/{id}/comite.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComiteRequest {

    @NotBlank(message = "numeroResolucion es obligatorio")
    private String numeroResolucion;

    @NotNull(message = "fechaDesignacion es obligatoria")
    private LocalDate fechaDesignacion;

    @NotEmpty(message = "Debe incluir al menos 3 miembros")
    @Size(min = 3, message = "El comité requiere mínimo 3 miembros")
    @Valid
    private List<MiembroItem> miembros;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MiembroItem {
        private Long idUsuario;
        @NotBlank private String nombresCompletos;
        private String cargo;
        @NotBlank private String rolComite;
        private Boolean esTitular;
        private String email;
    }
}
