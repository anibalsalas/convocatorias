package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;

/**
 * DTO de salida para catálogo TBL_DENOMINACION_PUESTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DenominacionPuestoResponse {

    private Long idDenominacionPuesto;
    private String codigo;
    private String descripcion;
    private Integer orden;
}
