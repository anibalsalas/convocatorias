package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConvocatoriaPublicaResponse {

    private Long idConvocatoria;
    private String numeroConvocatoria;
    private String descripcion;
    private String objetoContratacion;
    private String estado;
    private Integer anio;

    private String nombrePuesto;
    private String unidadOrganica;
    private String fuenteFinanciamiento;

    private LocalDate fechaPublicacion;
    private LocalDate fechaIniPostulacion;
    private LocalDate fechaFinPostulacion;
    private LocalDate fechaEvaluacion;
    private LocalDate fechaResultado;

    private String linkPortalAcffaa;
    private String linkTalentoPeru;
}