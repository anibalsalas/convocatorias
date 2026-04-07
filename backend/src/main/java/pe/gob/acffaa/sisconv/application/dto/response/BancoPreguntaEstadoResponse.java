package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;

import java.math.BigDecimal;

/**
 * Response para ORH — solo metadatos del banco, SIN contenido de preguntas.
 * Incluye factores TECNICA y cronograma para pantalla E26-V sin requerir config previa.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BancoPreguntaEstadoResponse {
    private Long idConvocatoria;
    private long totalPreguntas;
    private boolean cargado;
    private String usuarioCarga;
    private String fechaCarga;
    private String mensaje;

    private BigDecimal puntajeMinimoTecnica;
    private BigDecimal puntajeMaximoTecnica;
    private String fechaInicioCronogramaTecnica;
    private String fechaFinCronogramaTecnica;
}
