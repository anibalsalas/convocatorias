package pe.gob.acffaa.sisconv.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO de entrada para E8: Configurar Motor de Reglas RF-14.
 * Tarea BPMN: Configurar Pesos Ponderados y Umbrales Motor RF-14 (Etapa 1 — ORH).
 * CU-05: ORH define pesos (sum=100%) y umbrales mínimos; criterios curriculares son opcionales.
 *
 * Coherencia: Endpoints_DTOs_v2 §2 E8 Request
 *
 * Validación de negocio: pesoEvalCurricular + pesoEvalTecnica + pesoEntrevista = 100.00
 * (CK_CONV_PESOS — validada en Service, no en DTO para mejor mensaje de error)
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ConfigurarReglasRequest {

    @NotNull(message = "Peso de Evaluación Curricular es obligatorio")
    @DecimalMin(value = "0.01", message = "Peso debe ser mayor a 0")
    private BigDecimal pesoEvalCurricular;

    @NotNull(message = "Peso de Evaluación Técnica es obligatorio")
    @DecimalMin(value = "0.01", message = "Peso debe ser mayor a 0")
    private BigDecimal pesoEvalTecnica;

    @NotNull(message = "Peso de Entrevista es obligatorio")
    @DecimalMin(value = "0.01", message = "Peso debe ser mayor a 0")
    private BigDecimal pesoEntrevista;

    @NotNull(message = "Umbral mínimo Curricular es obligatorio")
    @DecimalMin(value = "0.00", message = "Umbral no puede ser negativo")
    private BigDecimal umbralCurricular;

    @NotNull(message = "Umbral mínimo Técnica es obligatorio")
    @DecimalMin(value = "0.00", message = "Umbral no puede ser negativo")
    private BigDecimal umbralTecnica;

    @NotNull(message = "Umbral mínimo Entrevista es obligatorio")
    @DecimalMin(value = "0.00", message = "Umbral no puede ser negativo")
    private BigDecimal umbralEntrevista;

    /** Vacío o null: no se crean reglas FILTRO. */
    @Valid
    private List<CriterioItem> criteriosCurriculares;

    /**
     * Criterio individual de evaluación curricular.
     * Endpoints_DTOs_v2 E8: { "criterio": "Formación académica", "puntajeMaximo": 30, "peso": 35 }
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CriterioItem {

        @NotBlank(message = "Nombre del criterio es obligatorio")
        private String criterio;

        @NotNull(message = "Puntaje máximo es obligatorio")
        @DecimalMin(value = "0.01", message = "Puntaje debe ser mayor a 0")
        private BigDecimal puntajeMaximo;

        @NotNull(message = "Peso del criterio es obligatorio")
        @DecimalMin(value = "0.01", message = "Peso debe ser mayor a 0")
        private BigDecimal peso;
    }
}
