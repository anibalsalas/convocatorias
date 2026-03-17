package pe.gob.acffaa.sisconv.application.dto.request;
import lombok.*;

/**
 * Request para verificación D.L. 1451 — RNSSC y REGIPREC
 * Mapea a columnas: VERIFICACION_RNSSC, VERIFICACION_REGIPREC, FECHA_VERIFICACION_DL
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VerificacionDl1451Request {
    private String verificacionRnssc;
    private String verificacionRegiprec;
    private String observacion;
}
