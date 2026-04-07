package pe.gob.acffaa.sisconv.application.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostulacionResponse {
    private Long idPostulacion;
    private Long idConvocatoria;
    private Long idPerfilPuesto;

    private String numeroConvocatoria;
    private String nombrePuesto;

    private PostulanteResponse postulante;
    private String estado;
    private String admisionRf07;
    private String codigoAnonimo;
    private String verificacionRnssc;
    private String verificacionRegiprec;
    private LocalDateTime fechaVerificacionDl;
    private String observacionDl;
    private BigDecimal puntajeCurricular;
    private BigDecimal puntajeTecnica;
    private BigDecimal puntajeEntrevista;
    private BigDecimal puntajeBonificacion;
    private BigDecimal puntajeTotal;
    private Integer ordenMerito;
    private String resultado;
    private LocalDateTime fechaPostulacion;

    private Integer totalExpedientes;
    private LocalDateTime fechaConfirmacionExpediente;
    private String estadoExpediente;
    private String estadoPostulacionVisible;

    private String mensaje;

    /** V34 — Examen técnico virtual: indica si hay examen publicado disponible para esta postulación */
    private Boolean examenVirtualDisponible;
    /** V34 — Estado del examen del postulante: null, EN_CURSO, FINALIZADO, EXPIRADO */
    private String estadoExamen;

    /** Desglose de scores por subcriterio — solo presente para APTO/NO_APTO (E24 ya ejecutado) */
    private List<EvalCurricularItem> evaluacionesCurriculares;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EvalCurricularItem {
        private Long idFactor;
        private BigDecimal puntajeObtenido;
    }
}