package pe.gob.acffaa.sisconv.application.dto.response;

import java.time.LocalDate;

/**
 * E10 Response — Actividad individual del cronograma.
 * GET /convocatorias/{id}/cronograma.
 */
public record ActividadCronogramaResponse(
        Long idCronograma,
        String etapa,
        String actividad,
        LocalDate fechaInicio,
        LocalDate fechaFin,
        String responsable,
        String lugar,
        Integer orden,
        String areaResp1,
        String areaResp2,
        String areaResp3
) {}
