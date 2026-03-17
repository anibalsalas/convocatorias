package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * DTO para requisitos del perfil: formación, conocimientos, cursos.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class RequisitoPuestoRequest {

    @NotNull(message = "Tipo de requisito es obligatorio")
    private Long idTipoRequisito;

    @NotBlank(message = "Descripción del requisito es obligatoria")
    @Size(max = 500, message = "Descripción no debe exceder 500 caracteres")
    private String descripcion;

    /** S=Obligatorio, N=Deseable. Por defecto S */
    private String esObligatorio = "S";

    private Integer orden = 0;
}
