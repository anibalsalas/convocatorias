package pe.gob.acffaa.sisconv.application.dto.response;

/**
 * Contexto de registro del perfil de puesto.
 * Se usa para autocompletar el área/unidad orgánica del usuario autenticado.
 */
public record PerfilPuestoContextResponse(
        Long idAreaSolicitante,
        String unidadOrganica,
        String username
) {
}
