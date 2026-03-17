package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.gob.acffaa.sisconv.application.dto.request.PostulanteDocumentoRequest;
import pe.gob.acffaa.sisconv.application.dto.response.PostulanteDocumentoResponse;
import pe.gob.acffaa.sisconv.application.dto.response.SustentoPdf;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.port.IStoragePort;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.Postulante;
import pe.gob.acffaa.sisconv.domain.model.PostulanteDocumento;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteDocumentoRepository;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteRepository;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;

import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class PostulanteDocumentoService {

    private static final String STORAGE_PREFIX = "documentos";

    private static final Set<String> TIPOS_DOCUMENTO_VALIDOS = Set.of(
            "DNI O CARNET DE EXTRANJERÍA",
            "RUC (ACTIVO Y HABIDO)",
            "COLEGIATURA PROFESIONAL",
            "HABILITACIÓN PROFESIONAL",
            "DISCAPACIDAD",
            "DEPORTISTA CALIFICADO DE ALTO NIVEL",
            "LICENCIADO DE LAS FUERZAS ARMADAS",
            "SERUMS",
            "LICENCIA DE CONDUCIR",
            "RÉCORD DEL CONDUCTOR SIN PAPELETAS",
            "DECLARACIÓN JURADA DE NO TENER ANTECEDENTES POLICIALES",
            "CERTIFICADO DE SALUD",
            "OTROS"
    );

    private final IPostulanteDocumentoRepository documentoRepository;
    private final IPostulanteRepository postulanteRepository;
    private final IUsuarioRepository usuarioRepository;
    private final IAuditPort auditPort;
    private final IStoragePort storagePort;

    public PostulanteDocumentoService(
            IPostulanteDocumentoRepository documentoRepository,
            IPostulanteRepository postulanteRepository,
            IUsuarioRepository usuarioRepository,
            IAuditPort auditPort,
            IStoragePort storagePort
    ) {
        this.documentoRepository = documentoRepository;
        this.postulanteRepository = postulanteRepository;
        this.usuarioRepository = usuarioRepository;
        this.auditPort = auditPort;
        this.storagePort = storagePort;
    }

    @Transactional(readOnly = true)
    public List<PostulanteDocumentoResponse> listar(String username) {
        Postulante postulante = resolvePostulante(username);
        return documentoRepository.findByPostulanteId(postulante.getIdPostulante())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PostulanteDocumentoResponse registrar(
            String username,
            PostulanteDocumentoRequest request,
            MultipartFile archivo,
            HttpServletRequest httpRequest
    ) throws Exception {
        Postulante postulante = resolvePostulante(username);
        validateRequest(postulante.getIdPostulante(), request);
        validatePdf(archivo);

        byte[] contenido = archivo.getBytes();
        String nombreArchivo = resolveFileName(archivo);

        PostulanteDocumento entity = PostulanteDocumento.builder()
                .postulante(postulante)
                .tipoDocumento(normalizeUpper(request.getTipoDocumento()))
                .nombreArchivo(nombreArchivo)
                .extension("pdf")
                .tamanoKb(toKb(contenido.length))
                .hashSha256(sha256(contenido))
                .usuarioCreacion(username)
                .estado("ACTIVO")
                .build();

        PostulanteDocumento saved = documentoRepository.save(entity);
        String ruta = buildRutaArchivo(postulante.getIdPostulante(), saved.getIdDocumento(), nombreArchivo);
        storagePort.guardar(ruta, contenido);
        saved.setRutaArchivo(ruta);
        documentoRepository.save(saved);

        auditPort.registrar("TBL_POSTULANTE_DOCUMENTO", saved.getIdDocumento(), "CREAR", httpRequest);
        return toResponse(saved);
    }

    @Transactional
    public void eliminar(
            String username,
            Long idDocumento,
            HttpServletRequest httpRequest
    ) {
        Postulante postulante = resolvePostulante(username);

        PostulanteDocumento entity = documentoRepository
                .findByIdAndPostulanteId(idDocumento, postulante.getIdPostulante())
                .orElseThrow(() -> new ResourceNotFoundException("Documento", idDocumento));

        if (entity.getRutaArchivo() != null && !entity.getRutaArchivo().isBlank()) {
            storagePort.eliminar(entity.getRutaArchivo());
        }

        entity.setRutaArchivo(null);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setEstado("INACTIVO");
        entity.setUsuarioModificacion(username);

        documentoRepository.save(entity);
        auditPort.registrar("TBL_POSTULANTE_DOCUMENTO", entity.getIdDocumento(), "ELIMINAR", httpRequest);
    }

    @Transactional(readOnly = true)
    public SustentoPdf obtenerSustento(String username, Long idDocumento) {
        Postulante postulante = resolvePostulante(username);

        PostulanteDocumento entity = documentoRepository
                .findByIdAndPostulanteId(idDocumento, postulante.getIdPostulante())
                .orElseThrow(() -> new ResourceNotFoundException("Documento", idDocumento));

        String nombreArchivo = entity.getNombreArchivo() != null ? entity.getNombreArchivo() : "sustento.pdf";
        byte[] contenido;

        if (entity.getRutaArchivo() != null && !entity.getRutaArchivo().isBlank()) {
            contenido = storagePort.leer(entity.getRutaArchivo());
        } else if (entity.getArchivoPdf() != null && entity.getArchivoPdf().length > 0) {
            contenido = entity.getArchivoPdf();
        } else {
            throw new ResourceNotFoundException("Sustento PDF", idDocumento);
        }

        return new SustentoPdf(nombreArchivo, contenido);
    }

    private void validateRequest(Long idPostulante, PostulanteDocumentoRequest request) {
        String tipoDocumento = normalizeUpper(request.getTipoDocumento());

        if (!TIPOS_DOCUMENTO_VALIDOS.contains(tipoDocumento)) {
            throw new DomainException("El tipo de documento no es válido");
        }

        if (documentoRepository.existsActiveByPostulanteIdAndTipoDocumento(idPostulante, tipoDocumento)) {
            throw new DomainException("Ya registró un documento para este tipo");
        }
    }

    private Postulante resolvePostulante(String username) {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", 0L));

        return postulanteRepository.findByUsuario_IdUsuario(usuario.getIdUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("Postulante", usuario.getIdUsuario()));
    }

    private void validatePdf(MultipartFile archivo) {
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

    private String buildRutaArchivo(Long idPostulante, Long idDocumento, String nombreArchivo) {
        String safeName = nombreArchivo.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        if (!safeName.toLowerCase().endsWith(".pdf")) {
            safeName = safeName + ".pdf";
        }
        return String.format("%s/%d/%d_%s", STORAGE_PREFIX, idPostulante, idDocumento, safeName);
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

    private PostulanteDocumentoResponse toResponse(PostulanteDocumento entity) {
        return PostulanteDocumentoResponse.builder()
                .idDocumento(entity.getIdDocumento())
                .tipoDocumento(entity.getTipoDocumento())
                .nombreArchivo(entity.getNombreArchivo())
                .tamanoKb(entity.getTamanoKb())
                .estado(entity.getEstado())
                .build();
    }
}