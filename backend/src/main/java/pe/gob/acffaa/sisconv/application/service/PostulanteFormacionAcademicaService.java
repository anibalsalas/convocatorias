package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.gob.acffaa.sisconv.application.dto.request.PostulanteFormacionAcademicaRequest;
import pe.gob.acffaa.sisconv.application.dto.response.PostulanteFormacionAcademicaResponse;
import pe.gob.acffaa.sisconv.application.dto.response.SustentoPdf;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.port.IStoragePort;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.Postulante;
import pe.gob.acffaa.sisconv.domain.model.PostulanteFormacionAcademica;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteFormacionAcademicaRepository;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteRepository;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;

import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PostulanteFormacionAcademicaService {

    private static final String STORAGE_PREFIX = "formacion-academica";

    private final IPostulanteFormacionAcademicaRepository formacionRepository;
    private final IPostulanteRepository postulanteRepository;
    private final IUsuarioRepository usuarioRepository;
    private final IAuditPort auditPort;
    private final IStoragePort storagePort;

    public PostulanteFormacionAcademicaService(
            IPostulanteFormacionAcademicaRepository formacionRepository,
            IPostulanteRepository postulanteRepository,
            IUsuarioRepository usuarioRepository,
            IAuditPort auditPort,
            IStoragePort storagePort
    ) {
        this.formacionRepository = formacionRepository;
        this.postulanteRepository = postulanteRepository;
        this.usuarioRepository = usuarioRepository;
        this.auditPort = auditPort;
        this.storagePort = storagePort;
    }

    public List<PostulanteFormacionAcademicaResponse> listar(String username) {
        Postulante postulante = resolvePostulante(username);
        return formacionRepository.findByPostulanteId(postulante.getIdPostulante())
                .stream()
                .map(entity -> toResponse(entity))
                .toList();
    }

    @Transactional
    public PostulanteFormacionAcademicaResponse registrar(
            String username,
            PostulanteFormacionAcademicaRequest request,
            MultipartFile archivo,
            HttpServletRequest httpRequest
    ) throws Exception {
        Postulante postulante = resolvePostulante(username);
        validatePdf(archivo, true);

        byte[] contenido = archivo.getBytes();
        String nombreArchivo = resolveFileName(archivo);

        PostulanteFormacionAcademica entity = PostulanteFormacionAcademica.builder()
                .postulante(postulante)
                .tipoFormacion(normalizeUpper(request.getFormacionAcademica()))
                .nivelAlcanzado(normalizeUpper(request.getNivelAlcanzado()))
                .carrera(normalizeUpper(request.getCarrera()))
                .centroEstudios(normalizeUpper(request.getCentroEstudios()))
                .fechaExpedicion(request.getFechaExpedicion())
                .nombreArchivo(nombreArchivo)
                .extension("pdf")
                .tamanoKb(toKb(contenido.length))
                .hashSha256(sha256(contenido))
                .usuarioCreacion(username)
                .estado("ACTIVO")
                .build();

        PostulanteFormacionAcademica saved = formacionRepository.save(entity);
        String ruta = buildRutaArchivo(postulante.getIdPostulante(), saved.getIdFormacionAcademica(), nombreArchivo);
        storagePort.guardar(ruta, contenido);
        saved.setRutaArchivo(ruta);
        formacionRepository.save(saved);

        auditPort.registrar("TBL_POSTULANTE_FORMACION_ACA", saved.getIdFormacionAcademica(), "CREAR", httpRequest);

        return toResponse(saved);
    }

    @Transactional
    public PostulanteFormacionAcademicaResponse actualizar(
            String username,
            Long idFormacionAcademica,
            PostulanteFormacionAcademicaRequest request,
            MultipartFile archivo,
            HttpServletRequest httpRequest
    ) throws Exception {
        Postulante postulante = resolvePostulante(username);

        PostulanteFormacionAcademica entity = formacionRepository
                .findByIdAndPostulanteId(idFormacionAcademica, postulante.getIdPostulante())
                .orElseThrow(() -> new ResourceNotFoundException("Formación Académica", idFormacionAcademica));

        entity.setTipoFormacion(normalizeUpper(request.getFormacionAcademica()));
        entity.setNivelAlcanzado(normalizeUpper(request.getNivelAlcanzado()));
        entity.setCarrera(normalizeUpper(request.getCarrera()));
        entity.setCentroEstudios(normalizeUpper(request.getCentroEstudios()));
        entity.setFechaExpedicion(request.getFechaExpedicion());
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
            String ruta = buildRutaArchivo(postulante.getIdPostulante(), entity.getIdFormacionAcademica(), nombreArchivo);
            storagePort.guardar(ruta, contenido);
            entity.setRutaArchivo(ruta);
        }

        PostulanteFormacionAcademica saved = formacionRepository.save(entity);
        auditPort.registrar("TBL_POSTULANTE_FORMACION_ACA", saved.getIdFormacionAcademica(), "ACTUALIZAR", httpRequest);

        return toResponse(saved);
    }

    @Transactional
    public void eliminar(
            String username,
            Long idFormacionAcademica,
            HttpServletRequest httpRequest
    ) {
        Postulante postulante = resolvePostulante(username);

        PostulanteFormacionAcademica entity = formacionRepository
                .findByIdAndPostulanteId(idFormacionAcademica, postulante.getIdPostulante())
                .orElseThrow(() -> new ResourceNotFoundException("Formación Académica", idFormacionAcademica));

        if (entity.getRutaArchivo() != null && !entity.getRutaArchivo().isBlank()) {
            storagePort.eliminar(entity.getRutaArchivo());
        }
        entity.setRutaArchivo(null);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setEstado("INACTIVO");
        entity.setUsuarioModificacion(username);

        formacionRepository.save(entity);
        auditPort.registrar("TBL_POSTULANTE_FORMACION_ACA", entity.getIdFormacionAcademica(), "ELIMINAR", httpRequest);
    }

    @Transactional(readOnly = true)
    public SustentoPdf obtenerSustento(String username, Long idFormacionAcademica) {
        Postulante postulante = resolvePostulante(username);

        PostulanteFormacionAcademica entity = formacionRepository
                .findByIdAndPostulanteId(idFormacionAcademica, postulante.getIdPostulante())
                .orElseThrow(() -> new ResourceNotFoundException("Formación Académica", idFormacionAcademica));

        String nombreArchivo = entity.getNombreArchivo() != null ? entity.getNombreArchivo() : "sustento.pdf";
        byte[] contenido;

        if (entity.getRutaArchivo() != null && !entity.getRutaArchivo().isBlank()) {
            contenido = storagePort.leer(entity.getRutaArchivo());
        } else if (entity.getArchivoPdf() != null && entity.getArchivoPdf().length > 0) {
            contenido = entity.getArchivoPdf();
        } else {
            throw new ResourceNotFoundException("Sustento PDF", idFormacionAcademica);
        }

        return new SustentoPdf(nombreArchivo, contenido);
    }

    private String buildRutaArchivo(Long idPostulante, Long idFormacionAcademica, String nombreArchivo) {
        String safeName = nombreArchivo.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        if (!safeName.toLowerCase().endsWith(".pdf")) {
            safeName = safeName + ".pdf";
        }
        return String.format("%s/%d/%d_%s", STORAGE_PREFIX, idPostulante, idFormacionAcademica, safeName);
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

    private PostulanteFormacionAcademicaResponse toResponse(PostulanteFormacionAcademica entity) {
        return PostulanteFormacionAcademicaResponse.builder()
                .idFormacionAcademica(entity.getIdFormacionAcademica())
                .formacionAcademica(entity.getTipoFormacion())
                .nivelAlcanzado(entity.getNivelAlcanzado())
                .carrera(entity.getCarrera())
                .centroEstudios(entity.getCentroEstudios())
                .fechaExpedicion(entity.getFechaExpedicion())
                .nombreArchivo(entity.getNombreArchivo())
                .tamanoKb(entity.getTamanoKb())
                .estado(entity.getEstado())
                .build();
    }
}