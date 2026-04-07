package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Dashboard AREA_SOLICITANTE: aviso por convocatoria con examen virtual y banco de preguntas.
 * Incluye convocatorias con banco ya completo ({@code bancoCompleto=true}) para mensaje persistente.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvisoBancoAreaResponse {
    private Long idConvocatoria;
    private String numeroConvocatoria;
    /** true si el banco tiene al menos 20 preguntas (umbral CAS examen virtual). */
    private boolean bancoCompleto;
}
