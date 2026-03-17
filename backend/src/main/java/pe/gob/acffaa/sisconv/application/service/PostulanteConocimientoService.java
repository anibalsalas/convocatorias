package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import pe.gob.acffaa.sisconv.application.dto.request.PostulanteConocimientoRequest;
import pe.gob.acffaa.sisconv.application.dto.response.PostulanteConocimientoResponse;
import pe.gob.acffaa.sisconv.application.dto.response.SustentoPdf;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.port.IStoragePort;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.Postulante;
import pe.gob.acffaa.sisconv.domain.model.PostulanteConocimiento;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteConocimientoRepository;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteRepository;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;

import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class PostulanteConocimientoService {

    private static final String STORAGE_PREFIX = "conocimientos";

    private static final Set<String> TIPOS_VALIDOS = Set.of(
            "CERTIFICACIÓN",
            "DIPLOMADO",
            "ESPECIALIZACIÓN",
            "CURSO",
            "PROGRAMA",
            "OFIMATICA",
            "IDIOMA"
    );

    private static final Set<String> NIVELES_VALIDOS = Set.of(
            "NO APLICA",
            "BÁSICO",
            "BASICO",
            "INTERMEDIO",
            "AVANZADO"
    );

    private static final Set<String> TIPO_OFIMATICA_VALIDOS = Set.of(
            "WORD",
            "EXCEL",
            "POWER POINT",
            "ACCESS",
            "OUTLOOK",
            "GOOGLE DOCS",
            "GOOGLE SHEETS",
            "GOOGLE SLIDES",
            "OTRO"
    );

    private final IPostulanteConocimientoRepository conocimientoRepository;
    private final IPostulanteRepository postulanteRepository;
    private final IUsuarioRepository usuarioRepository;
    private final IAuditPort auditPort;
    private final IStoragePort storagePort;

    public PostulanteConocimientoService(
            IPostulanteConocimientoRepository conocimientoRepository,
            IPostulanteRepository postulanteRepository,
            IUsuarioRepository usuarioRepository,
            IAuditPort auditPort,
            IStoragePort storagePort
    ) {
        this.conocimientoRepository = conocimientoRepository;
        this.postulanteRepository = postulanteRepository;
        this.usuarioRepository = usuarioRepository;
        this.auditPort = auditPort;
        this.storagePort = storagePort;
    }

    public List<PostulanteConocimientoResponse> listar(String username) {
        Postulante postulante = resolvePostulante(username);
        return conocimientoRepository.findByPostulanteId(postulante.getIdPostulante())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PostulanteConocimientoResponse registrar(
            String username,
            PostulanteConocimientoRequest request,
            MultipartFile archivo,
            HttpServletRequest httpRequest
    ) throws Exception {
        Postulante postulante = resolvePostulante(username);
        validateRequest(request);
        validatePdf(archivo, true);

        byte[] contenido = archivo.getBytes();
        String nombreArchivo = resolveFileName(archivo);

        PostulanteConocimiento entity = PostulanteConocimiento.builder()
                .postulante(postulante)
                .tipoConocimiento(normalizeUpper(request.getTipoConocimiento()))
                .descripcion(normalizeUpper(request.getDescripcion()))
                .nivel(normalizeLevel(request.getNivel()))
                .tipoOfimatica(normalizeUpper(request.getTipoOfimatica()))
                .institucion(normalizeUpper(request.getInstitucion()))
                .horas(request.getHoras())
                .fechaInicio(request.getFechaInicio())
                .fechaFin(request.getFechaFin())
                .nombreArchivo(nombreArchivo)
                .extension("pdf")
                .tamanoKb(toKb(contenido.length))
                .hashSha256(sha256(contenido))
                .archivoPdf(new byte[0]) // Placeholder: PDF en disco. Ejecutar V9__add_ruta_archivo_conocimientos.sql para hacer ARCHIVO_PDF nullable.
                .usuarioCreacion(username)
                .estado("ACTIVO")
                .build();

        PostulanteConocimiento saved = conocimientoRepository.save(entity);
        String ruta = buildRutaArchivo(postulante.getIdPostulante(), saved.getIdConocimiento(), nombreArchivo);
        storagePort.guardar(ruta, contenido);
        saved.setRutaArchivo(ruta);
        conocimientoRepository.save(saved);

        auditPort.registrar("TBL_POSTULANTE_CONOCIMIENTO", saved.getIdConocimiento(), "CREAR", httpRequest);

        return toResponse(saved);
    }

    @Transactional
    public PostulanteConocimientoResponse actualizar(
            String username,
            Long idConocimiento,
            PostulanteConocimientoRequest request,
            MultipartFile archivo,
            HttpServletRequest httpRequest
    ) throws Exception {
        Postulante postulante = resolvePostulante(username);
        validateRequest(request);

        PostulanteConocimiento entity = conocimientoRepository
                .findByIdAndPostulanteId(idConocimiento, postulante.getIdPostulante())
                .orElseThrow(() -> new ResourceNotFoundException("Conocimiento", idConocimiento));

        entity.setTipoConocimiento(normalizeUpper(request.getTipoConocimiento()));
        entity.setDescripcion(normalizeUpper(request.getDescripcion()));
        entity.setNivel(normalizeLevel(request.getNivel()));
        entity.setTipoOfimatica(normalizeUpper(request.getTipoOfimatica()));
        entity.setInstitucion(normalizeUpper(request.getInstitucion()));
        entity.setHoras(request.getHoras());
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
            String ruta = buildRutaArchivo(postulante.getIdPostulante(), entity.getIdConocimiento(), nombreArchivo);
            storagePort.guardar(ruta, contenido);
            entity.setRutaArchivo(ruta);
        }

        PostulanteConocimiento saved = conocimientoRepository.save(entity);
        auditPort.registrar("TBL_POSTULANTE_CONOCIMIENTO", saved.getIdConocimiento(), "ACTUALIZAR", httpRequest);

        return toResponse(saved);
    }

    @Transactional
    public void eliminar(
            String username,
            Long idConocimiento,
            HttpServletRequest httpRequest
    ) {
        Postulante postulante = resolvePostulante(username);

        PostulanteConocimiento entity = conocimientoRepository
                .findByIdAndPostulanteId(idConocimiento, postulante.getIdPostulante())
                .orElseThrow(() -> new ResourceNotFoundException("Conocimiento", idConocimiento));

        if (entity.getRutaArchivo() != null && !entity.getRutaArchivo().isBlank()) {
            storagePort.eliminar(entity.getRutaArchivo());
        }
        entity.setRutaArchivo(null);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setEstado("INACTIVO");
        entity.setUsuarioModificacion(username);

        conocimientoRepository.save(entity);
        auditPort.registrar("TBL_POSTULANTE_CONOCIMIENTO", entity.getIdConocimiento(), "ELIMINAR", httpRequest);
    }

    public SustentoPdf obtenerSustento(String username, Long idConocimiento) {
        Postulante postulante = resolvePostulante(username);

        PostulanteConocimiento entity = conocimientoRepository
                .findByIdAndPostulanteId(idConocimiento, postulante.getIdPostulante())
                .orElseThrow(() -> new ResourceNotFoundException("Conocimiento", idConocimiento));

        String nombreArchivo = entity.getNombreArchivo() != null ? entity.getNombreArchivo() : "sustento.pdf";
        byte[] contenido;

        if (entity.getRutaArchivo() != null && !entity.getRutaArchivo().isBlank()) {
            contenido = storagePort.leer(entity.getRutaArchivo());
        } else if (entity.getArchivoPdf() != null && entity.getArchivoPdf().length > 0) {
            contenido = entity.getArchivoPdf();
        } else {
            throw new ResourceNotFoundException("Sustento PDF", idConocimiento);
        }

        return new SustentoPdf(nombreArchivo, contenido);
    }

    private String buildRutaArchivo(Long idPostulante, Long idConocimiento, String nombreArchivo) {
        String safeName = nombreArchivo.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        if (!safeName.toLowerCase().endsWith(".pdf")) {
            safeName = safeName + ".pdf";
        }
        return String.format("%s/%d/%d_%s", STORAGE_PREFIX, idPostulante, idConocimiento, safeName);
    }

    private Postulante resolvePostulante(String username) {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", 0L));

        return postulanteRepository.findByUsuario_IdUsuario(usuario.getIdUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("Postulante", usuario.getIdUsuario()));
    }

    private void validateRequest(PostulanteConocimientoRequest request) {
        String tipo = normalizeUpper(request.getTipoConocimiento());
        String nivel = normalizeUpper(request.getNivel());

        if (!TIPOS_VALIDOS.contains(tipo)) {
            throw new DomainException("El tipo de conocimiento no es válido");
        }

        if (!NIVELES_VALIDOS.contains(nivel)) {
            throw new DomainException("El nivel no es válido");
        }

        if ("OFIMATICA".equals(tipo)) {
            String tipoOfimatica = normalizeUpper(request.getTipoOfimatica());
            if (tipoOfimatica == null || tipoOfimatica.isBlank()) {
                throw new DomainException("Debe seleccionar el tipo de ofimática");
            }
            if (!TIPO_OFIMATICA_VALIDOS.contains(tipoOfimatica)) {
                throw new DomainException("El tipo de ofimática no es válido");
            }
        }

        boolean requiereFechas = !"OFIMATICA".equals(tipo) && !"IDIOMA".equals(tipo);
        if (requiereFechas) {
            if ((request.getFechaInicio() == null && request.getFechaFin() != null)
                    || (request.getFechaInicio() != null && request.getFechaFin() == null)) {
                throw new DomainException("Debe ingresar ambas fechas: inicio y fin");
            }
            if (request.getFechaInicio() != null
                    && request.getFechaFin() != null
                    && request.getFechaFin().isBefore(request.getFechaInicio())) {
                throw new DomainException("La fecha fin no puede ser menor que la fecha inicio");
            }
        }
    }

    private static final long MAX_PDF_BYTES = 3L * 1024 * 1024;

    private void validatePdf(MultipartFile archivo, boolean required) {
        if (!required && (archivo == null || archivo.isEmpty())) {
            return;
        }

        if (archivo == null || archivo.isEmpty()) {
            throw new DomainException("Debe adjuntar el sustento en PDF");
        }

        if (archivo.getSize() > MAX_PDF_BYTES) {
            throw new DomainException("El archivo PDF no debe superar 3 MB");
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

    private String normalizeLevel(String value) {
        String normalized = normalizeUpper(value);
        if ("BASICO".equals(normalized)) {
            return "BÁSICO";
        }
        return normalized;
    }

    private PostulanteConocimientoResponse toResponse(PostulanteConocimiento entity) {
        return PostulanteConocimientoResponse.builder()
                .idConocimiento(entity.getIdConocimiento())
                .tipoConocimiento(entity.getTipoConocimiento())
                .descripcion(entity.getDescripcion())
                .nivel(entity.getNivel())
                .tipoOfimatica(entity.getTipoOfimatica())
                .institucion(entity.getInstitucion())
                .horas(entity.getHoras())
                .fechaInicio(entity.getFechaInicio())
                .fechaFin(entity.getFechaFin())
                .nombreArchivo(entity.getNombreArchivo())
                .tamanoKb(entity.getTamanoKb())
                .estado(entity.getEstado())
                .build();
    }
}