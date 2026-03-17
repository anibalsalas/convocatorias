package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;

/**
 * DTO de salida para catálogo TBL_NIVEL_PUESTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NivelPuestoResponse {

    private Long idNivelPuesto;
    private String codigo;
    private String descripcion;
    private Integer orden;
}
