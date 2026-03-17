package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostulanteExperienciaResponse {

    private Long idExperiencia;
    private String tipoExperiencia;
    private String tipoSector;
    private String institucion;
    private String puesto;
    private String nivel;
    private String funciones;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private String nombreArchivo;
    private Long tamanoKb;
    private String estado;
}