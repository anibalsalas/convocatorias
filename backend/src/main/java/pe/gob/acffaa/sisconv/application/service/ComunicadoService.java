package pe.gob.acffaa.sisconv.application.service;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.acffaa.sisconv.application.dto.request.ComunicadoRequest;
import pe.gob.acffaa.sisconv.application.dto.response.ComunicadoResponse;
import pe.gob.acffaa.sisconv.domain.model.Comunicado;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;
import pe.gob.acffaa.sisconv.domain.repository.IComunicadoRepository;
import pe.gob.acffaa.sisconv.domain.repository.IConvocatoriaRepository;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ComunicadoService — SRP: único responsable de la gestión de comunicados.
 * DS 083-2019-PCM Art. 10 — aclaraciones y ampliaciones de plazo.
 */
@Service
public class ComunicadoService {

    private final IComunicadoRepository comunicadoRepo;
    private final IConvocatoriaRepository convRepo;

    public ComunicadoService(IComunicadoRepository comunicadoRepo,
                             IConvocatoriaRepository convRepo) {
        this.comunicadoRepo = comunicadoRepo;
        this.convRepo = convRepo;
    }

    private String user() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private ComunicadoResponse toResponse(Comunicado c, String mensaje) {
        return ComunicadoResponse.builder()
                .idComunicado(c.getIdComunicado())
                .idConvocatoria(c.getConvocatoria().getIdConvocatoria())
                .numeroConvocatoria(c.getConvocatoria().getNumeroConvocatoria())
                .titulo(c.getTitulo())
                .descripcion(c.getDescripcion())
                .fechaPublicacion(c.getFechaPublicacion())
                .usuarioCreacion(c.getUsuarioCreacion())
                .mensaje(mensaje)
                .build();
    }

    /** POST /convocatorias/{id}/comunicados — ORH publica un comunicado. */
    @Transactional
    public ComunicadoResponse publicar(Long idConvocatoria, ComunicadoRequest req) {
        Convocatoria conv = convRepo.findById(idConvocatoria)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConvocatoria));

        Comunicado comunicado = Comunicado.builder()
                .convocatoria(conv)
                .titulo(req.getTitulo().trim())
                .descripcion(req.getDescripcion().trim())
                .usuarioCreacion(user())
                .build();

        Comunicado saved = comunicadoRepo.save(comunicado);
        return toResponse(saved, "Comunicado publicado correctamente");
    }

    /** GET /convocatorias/{id}/comunicados — lista admin (con usuarioCreacion). */
    @Transactional(readOnly = true)
    public List<ComunicadoResponse> listar(Long idConvocatoria) {
        convRepo.findById(idConvocatoria)
                .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConvocatoria));
        return comunicadoRepo.findByConvocatoriaId(idConvocatoria)
                .stream()
                .map(c -> toResponse(c, null))
                .collect(Collectors.toList());
    }

    /** GET /convocatorias/publicas/{id}/comunicados — lista pública (sin auth). */
    @Transactional(readOnly = true)
    public List<ComunicadoResponse> listarPublico(Long idConvocatoria) {
        return comunicadoRepo.findByConvocatoriaId(idConvocatoria)
                .stream()
                .map(c -> ComunicadoResponse.builder()
                        .idComunicado(c.getIdComunicado())
                        .idConvocatoria(c.getConvocatoria().getIdConvocatoria())
                        .titulo(c.getTitulo())
                        .descripcion(c.getDescripcion())
                        .fechaPublicacion(c.getFechaPublicacion())
                        .build())
                .collect(Collectors.toList());
    }
}
