package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.gob.acffaa.sisconv.application.dto.request.PostulanteExperienciaRequest;
import pe.gob.acffaa.sisconv.application.dto.response.PostulanteExperienciaResponse;
import pe.gob.acffaa.sisconv.application.dto.response.SustentoPdf;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.port.IStoragePort;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.Postulante;
import pe.gob.acffaa.sisconv.domain.model.PostulanteExperiencia;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteExperienciaRepository;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteRepository;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;

import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class PostulanteExperienciaService {

    private static final String STORAGE_PREFIX = "experiencias";

    private static final Set<String> TIPOS_EXPERIENCIA_VALIDOS = Set.of(
            "GENERAL",
            "ESPECIFICA"
    );

    private static final Set<String> TIPOS_SECTOR_VALIDOS = Set.of(
            "PUBLICO",
            "PRIVADO"
    );

    private final IPostulanteExperienciaRepository experienciaRepository;
    private final IPostulanteRepository postulanteRepository;
    private final IUsuarioRepository usuarioRepository;
    private final IAuditPort auditPort;
    private final IStoragePort storagePort;

    public PostulanteExperienciaService(
            IPostulanteExperienciaRepository experienciaRepository,
            IPostulanteRepository postulanteRepository,
            IUsuarioRepository usuarioRepository,
            IAuditPort auditPort,
            IStoragePort storagePort
    ) {
        this.experienciaRepository = experienciaRepository;
        this.postulanteRepository = postulanteRepository;
        this.usuarioRepository = usuarioRepository;
        this.auditPort = auditPort;
        this.storagePort = storagePort;
    }

    @Transactional(readOnly = true)
    public List<PostulanteExperienciaResponse> listar(String username) {
        Postulante postulante = resolvePostulante(username);
        return experienciaRepository.findByPostulanteId(postulante.getIdPostulante())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PostulanteExperienciaResponse registrar(
            String username,
            PostulanteExperienciaRequest request,
            MultipartFile archivo,
            HttpServletRequest httpRequest
    ) throws Exception {
        Postulante postulante = resolvePostulante(username);
        validateRequest(request);
        validatePdf(archivo, true);

        byte[] contenido = archivo.getBytes();
        String nombreArchivo = resolveFileName(archivo);

        PostulanteExperiencia entity = PostulanteExperiencia.builder()
                .postulante(postulante)
                .tipoExperiencia(normalizeUpper(request.getTipoExperiencia()))
                .tipoSector(normalizeUpper(request.getTipoSector()))
                .institucion(normalizeUpper(request.getInstitucion()))
                .puesto(normalizeUpper(request.getPuesto()))
                .nivel(normalizeUpper(request.getNivel()))
                .funciones(normalizeUpper(request.getFunciones()))
                .fechaInicio(request.getFechaInicio())
                .fechaFin(request.getFechaFin())
                .nombreArchivo(nombreArchivo)
                .extension("pdf")
                .tamanoKb(toKb(contenido.length))
                .hashSha256(sha256(contenido))
                .usuarioCreacion(username)
                .estado("ACTIVO")
                .build();

        PostulanteExperiencia saved = experienciaRepository.save(entity);
        String ruta = buildRutaArchivo(postulante.getIdPostulante(), saved.getIdExperiencia(), nombreArchivo);
        storagePort.guardar(ruta, contenido);
        saved.setRutaArchivo(ruta);
        experienciaRepository.save(saved);

        auditPort.registrar("TBL_POSTULANTE_EXPERIENCIA", saved.getIdExperiencia(), "CREAR", httpRequest);
        return toResponse(saved);
    }

    @Transactional
    public PostulanteExperienciaResponse actualizar(
            String username,
            Long idExperiencia,
            PostulanteExperienciaRequest request,
            MultipartFile archivo,
            HttpServletRequest httpRequest
    ) throws Exception {
        Postulante postulante = resolvePostulante(username);
        validateRequest(request);

        PostulanteExperiencia entity = experienciaRepository
                .findByIdAndPostulanteId(idExperiencia, postulante.getIdPostulante())
                .orElseThrow(() -> new ResourceNotFoundException("Experiencia", idExperiencia));

        entity.setTipoExperiencia(normalizeUpper(request.getTipoExperiencia()));
        entity.setTipoSector(normalizeUpper(request.getTipoSector()));
        entity.setInstitucion(normalizeUpper(request.getInstitucion()));
        entity.setPuesto(normalizeUpper(request.getPuesto()));
        entity.setNivel(normalizeUpper(request.getNivel()));
        entity.setFunciones(normalizeUpper(request.getFunciones()));
        entity.setFechaInicio(request.getFechaInicio());
        entity.setFechaFin(request.getFechaFin());
        entity.setUsuarioModificacion(username);

        if (archivo != null && !archivo.isEmpty()) {
            validatePdf(archivo, false);
            byte[] contenido = archivo.getBytes();
            String nombreArchivo = resolveFileName(archivo);

            entity.setNombreArchivo(nombreArchivo);
            entity.setExtension("pdf");
            entity.setTamanoKb(toKb(contenido.length));
            entity.setHashSha256(sha256(contenido));

            if (entity.getRutaArchivo() != null && !entity.getRutaArchivo().isBlank()) {
                storagePort.eliminar(entity.getRutaArchivo());
            }

            String ruta = buildRutaArchivo(postulante.getIdPostulante(), entity.getIdExperiencia(), nombreArchivo);
            storagePort.guardar(ruta, contenido);
            entity.setRutaArchivo(ruta);
        }

        PostulanteExperiencia saved = experienciaRepository.save(entity);
        auditPort.registrar("TBL_POSTULANTE_EXPERIENCIA", saved.getIdExperiencia(), "ACTUALIZAR", httpRequest);
        return toResponse(saved);
    }

    @Transactional
    public void eliminar(
            String username,
            Long idExperiencia,
            HttpServletRequest httpRequest
    ) {
        Postulante postulante = resolvePostulante(username);

        PostulanteExperiencia entity = experienciaRepository
                .findByIdAndPostulanteId(idExperiencia, postulante.getIdPostulante())
                .orElseThrow(() -> new ResourceNotFoundException("Experiencia", idExperiencia));

        if (entity.getRutaArchivo() != null && !entity.getRutaArchivo().isBlank()) {
            storagePort.eliminar(entity.getRutaArchivo());
        }

        entity.setRutaArchivo(null);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setEstado("INACTIVO");
        entity.setUsuarioModificacion(username);

        experienciaRepository.save(entity);
        auditPort.registrar("TBL_POSTULANTE_EXPERIENCIA", entity.getIdExperiencia(), "ELIMINAR", httpRequest);
    }

    @Transactional(readOnly = true)
    public SustentoPdf obtenerSustento(String username, Long idExperiencia) {
        Postulante postulante = resolvePostulante(username);

        PostulanteExperiencia entity = experienciaRepository
                .findByIdAndPostulanteId(idExperiencia, postulante.getIdPostulante())
                .orElseThrow(() -> new ResourceNotFoundException("Experiencia", idExperiencia));

        String nombreArchivo = entity.getNombreArchivo() != null ? entity.getNombreArchivo() : "sustento.pdf";
        byte[] contenido;

        if (entity.getRutaArchivo() != null && !entity.getRutaArchivo().isBlank()) {
            contenido = storagePort.leer(entity.getRutaArchivo());
        } else if (entity.getArchivoPdf() != null && entity.getArchivoPdf().length > 0) {
            contenido = entity.getArchivoPdf();
        } else {
            throw new ResourceNotFoundException("Sustento PDF", idExperiencia);
        }

        return new SustentoPdf(nombreArchivo, contenido);
    }

    private void validateRequest(PostulanteExperienciaRequest request) {
        if (request.getFechaInicio() == null) {
            throw new DomainException("La fecha de inicio es obligatoria");
        }

        if (request.getFechaFin() == null) {
            throw new DomainException("La fecha de fin es obligatoria");
        }

        if (request.getFechaFin().isBefore(request.getFechaInicio())) {
            throw new DomainException("La fecha fin no puede ser menor que la fecha inicio");
        }

        String tipoExperiencia = normalizeUpper(request.getTipoExperiencia());
        String tipoSector = normalizeUpper(request.getTipoSector());

        if (!TIPOS_EXPERIENCIA_VALIDOS.contains(tipoExperiencia)) {
            throw new DomainException("El tipo de experiencia no es válido");
        }

        if (!TIPOS_SECTOR_VALIDOS.contains(tipoSector)) {
            throw new DomainException("El tipo de sector no es válido");
        }
    }

    private Postulante resolvePostulante(String username) {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", 0L));

        return postulanteRepository.findByUsuario_IdUsuario(usuario.getIdUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("Postulante", usuario.getIdUsuario()));
    }

    private void validatePdf(MultipartFile archivo, boolean required) {
        if (!required && (archivo == null || archivo.isEmpty())) {
            return;
        }

        if (archivo == null || archivo.isEmpty()) {
            throw new DomainException("Debe adjuntar el sustento en PDF");
        }

        String nombre = Optional.ofNullable(archivo.getOriginalFilename()).orElse("").toLowerCase();
        String contentType = Optional.ofNullable(archivo.getContentType()).orElse("").toLowerCase();

        boolean validByName = nombre.endsWith(".pdf");
        boolean validByType = "application/pdf".equals(contentType);

        if (!validByName && !validByType) {
            throw new DomainException("Solo se permite adjuntar archivos PDF");
        }
    }

    private String resolveFileName(MultipartFile archivo) {
        String original = Optional.ofNullable(archivo.getOriginalFilename()).orElse("sustento.pdf").trim();
        return original.isBlank() ? "sustento.pdf" : original;
    }

    private String buildRutaArchivo(Long idPostulante, Long idExperiencia, String nombreArchivo) {
        String safeName = nombreArchivo.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        if (!safeName.toLowerCase().endsWith(".pdf")) {
            safeName = safeName + ".pdf";
        }
        return String.format("%s/%d/%d_%s", STORAGE_PREFIX, idPostulante, idExperiencia, safeName);
    }

    private long toKb(long bytes) {
        return Math.max(1L, (bytes + 1023L) / 1024L);
    }

    private String sha256(byte[] contenido) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(contenido);
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new DomainException("No se pudo generar la huella digital del archivo");
        }
    }

    private String normalizeUpper(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized.toUpperCase();
    }

    private PostulanteExperienciaResponse toResponse(PostulanteExperiencia entity) {
        return PostulanteExperienciaResponse.builder()
                .idExperiencia(entity.getIdExperiencia())
                .tipoExperiencia(entity.getTipoExperiencia())
                .tipoSector(entity.getTipoSector())
                .institucion(entity.getInstitucion())
                .puesto(entity.getPuesto())
                .nivel(entity.getNivel())
                .funciones(entity.getFunciones())
                .fechaInicio(entity.getFechaInicio())
                .fechaFin(entity.getFechaFin())
                .nombreArchivo(entity.getNombreArchivo())
                .tamanoKb(entity.getTamanoKb())
                .estado(entity.getEstado())
                .build();
    }
}