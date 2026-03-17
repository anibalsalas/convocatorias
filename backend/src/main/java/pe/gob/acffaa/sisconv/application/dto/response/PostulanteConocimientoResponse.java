package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostulanteConocimientoResponse {

    private Long idConocimiento;
    private String tipoConocimiento;
    private String descripcion;
    private String nivel;
    private String tipoOfimatica;
    private String institucion;
    private Integer horas;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private String nombreArchivo;
    private Long tamanoKb;
    private String estado;
}