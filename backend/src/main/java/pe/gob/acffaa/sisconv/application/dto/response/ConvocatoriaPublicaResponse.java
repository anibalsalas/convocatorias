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

    /**
     * Label de estado para vista pública/postulante.
     * "NUEVO" si fechaPublicacion <= 30 días atrás y estado=PUBLICADA.
     * Campo derivado — no persiste en BD, no altera el estado interno de negocio.
     */
    private String estadoPortal;

    /**
     * true si ya existen postulaciones APTO o NO_APTO para esta convocatoria,
     * es decir, la evaluación curricular E24 fue ejecutada y sus resultados pueden descargarse.
     * Campo derivado — no persiste en BD.
     */
    private boolean tieneResultadosCurriculares;

    /**
     * true si el COMITÉ presionó "Publicar Evaluación Técnica" (E26),
     * es decir, los resultados técnicos están publicados y disponibles en el portal.
     * Campo derivado — refleja RESULTADOS_TECNICOS_PUBLICADOS de TBL_CONVOCATORIA.
     */
    private boolean tieneResultadosTecnicos;

    /**
     * true si ORH presionó "Publicar Resultados" en E27,
     * es decir, los resultados de entrevista están publicados y disponibles en el portal.
     * Campo derivado — refleja ENTREVISTA_PUBLICADA de TBL_CONVOCATORIA.
     */
    private boolean tieneResultadosEntrevista;

    /**
     * true si ORH ejecutó E31 y la convocatoria está FINALIZADA.
     * El Resultado Final (cuadro de méritos completo) es público desde ese momento.
     * Campo derivado — refleja ESTADO = 'FINALIZADA' de TBL_CONVOCATORIA.
     */
    private boolean tieneResultadoFinal;

    /**
     * true si ORH publicó al menos un comunicado oficial para esta convocatoria.
     * DS 083-2019-PCM Art. 10 — aclaraciones, fe de erratas, ampliaciones de plazo.
     */
    private boolean tieneComunicados;
}