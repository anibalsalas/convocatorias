package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PerfilPuestoRequest {

    @Size(max = 300, message = "El nombre del puesto no debe exceder 300 caracteres")
    private String nombrePuesto;

    @NotBlank(message = "Denominación del puesto es obligatoria")
    @Size(max = 300, message = "Denominación no debe exceder 300 caracteres")
    private String denominacionPuesto;

    @NotBlank(message = "Unidad orgánica es obligatoria")
    @Size(max = 200, message = "Unidad orgánica no debe exceder 200 caracteres")
    private String unidadOrganica;

    @NotNull(message = "ID del área solicitante es obligatorio")
    private Long idAreaSolicitante;

    private Long idNivelPuesto;
    private Long idNivelFormacion;

    @Size(max = 250, message = "La dependencia jerárquica lineal no debe exceder 250 caracteres")
    private String dependenciaJerarquicaLineal;

    @Size(max = 250, message = "La dependencia funcional no debe exceder 250 caracteres")
    private String dependenciaFuncional;

    @Min(value = 0, message = "Los puestos a cargo no pueden ser negativos")
    private Integer puestosCargo;

    @Size(max = 200, message = "Experiencia general no debe exceder 200 caracteres")
    private String experienciaGeneral;

    @Size(max = 200, message = "Experiencia específica no debe exceder 200 caracteres")
    private String experienciaEspecifica;

    @Size(max = 500, message = "Habilidades no debe exceder 500 caracteres")
    private String habilidades;

    @Size(max = 500, message = "Formación académica no debe exceder 500 caracteres")
    private String formacionAcademica;

    @Size(max = 500, message = "Cursos/Estudios de especialización no debe exceder 500 caracteres")
    private String cursosEspecializacion;

    @Size(max = 500, message = "Conocimientos para el puesto no debe exceder 500 caracteres")
    private String conocimientosPuesto;

    @NotBlank(message = "La misión del puesto es obligatoria")
    @Size(max = 1000, message = "Misión del puesto no debe exceder 1000 caracteres")
    private String misionPuesto;

    @NotNull(message = "La cantidad de puestos es obligatoria")
    @Min(value = 1, message = "Cantidad de puestos debe ser al menos 1")
    private Integer cantidadPuestos = 1;

    @Valid
    private List<PerfilFormacionAcademicaRequest> formacionesAcademicas;

    @Valid
    private List<PerfilConocimientoRequest> conocimientos;

    @Valid
    private List<PerfilExperienciaRequest> experiencias;

    @Valid
    private List<RequisitoPuestoRequest> requisitos;

    @Valid
    private List<FuncionPuestoRequest> funciones;

    @Valid
    private CondicionPuestoRequest condicion;
}
