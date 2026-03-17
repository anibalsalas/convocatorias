package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostulanteFormacionAcademicaResponse {

    private Long idFormacionAcademica;
    private String formacionAcademica;
    private String nivelAlcanzado;
    private String carrera;
    private String centroEstudios;
    private LocalDate fechaExpedicion;
    private String nombreArchivo;
    private Long tamanoKb;
    private String estado;
}