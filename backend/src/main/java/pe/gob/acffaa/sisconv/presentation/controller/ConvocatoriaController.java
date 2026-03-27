package pe.gob.acffaa.sisconv.presentation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.ActividadCronogramaResponse;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.service.ConvocatoriaService;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;
import pe.gob.acffaa.sisconv.application.dto.request.MiembroComiteRequest;
import pe.gob.acffaa.sisconv.application.dto.response.ComiteDetalleResponse;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.time.LocalDate;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

/**
 * Controlador REST para gestión de Convocatorias CAS — PKG-02.
 *
 * Endpoints:
 *   E9:  POST /convocatorias                              — Crear convocatoria
 *   E10: POST /convocatorias/{id}/cronograma              — Registrar cronograma
 *   E11: POST /convocatorias/{id}/comite                  — Registrar comité
 *   E12: POST /convocatorias/{id}/factores                — Registrar factores
 *   E13: POST /convocatorias/{id}/acta-instalacion        — Generar acta
 *   E14: PUT  /convocatorias/{id}/acta-instalacion/cargar — Cargar acta firmada
 *   E15: PUT  /convocatorias/{id}/aprobar                 — Aprobar y publicar
 *   E16: GET  /convocatorias/{id}/bases-pdf               — Generar bases PDF
 *   ---: GET  /convocatorias                              — Listar paginado
 *   ---: GET  /convocatorias/{id}                         — Detalle por ID
 *
 * Flujo BPMN Etapa 2: Crear → Cronograma → Comité → Factores → Acta → Aprobar/Publicar
 *
 * RBAC: ADMIN (total), ORH (E9/E10/E11/E15/E16), COMITE (E12/E13/E14)
 * Auditoría D.L. 1451: Cada operación se registra en TBL_LOG_TRANSPARENCIA.
 */
@RestController
@RequestMapping("/convocatorias")
@Tag(name = "PKG-02: Convocatoria", description = "Elaboración de convocatorias CAS — Etapa 2")
public class ConvocatoriaController {

    private final ConvocatoriaService convService;
    private final IUsuarioRepository usuarioRepo;

    public ConvocatoriaController(ConvocatoriaService convService,
                                   IUsuarioRepository usuarioRepo) {
        this.convService = convService;
        this.usuarioRepo = usuarioRepo;
    }

    @GetMapping("/next-number")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "Obtener siguiente número de convocatoria",
            description = "Reserva un correlativo de SEQ_NUM_CONVOCATORIA para mostrar el N° CAS en modo readonly durante el alta.")
    public ResponseEntity<ApiResponse<String>> obtenerCorrelativoSiguiente() {
        return ResponseEntity.ok(ApiResponse.ok(convService.obtenerSiguienteNumeroConvocatoria()));
    }

    // ══════════════════════════════════════════════════════════════
    // E9 — POST /convocatorias — Crear convocatoria CAS
    // ══════════════════════════════════════════════════════════════

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "E9: Crear convocatoria CAS",
            description = "CU-06: Crear convocatoria vinculada a requerimiento CONFIGURADO. Hereda pesos Motor RF-14")
    public ResponseEntity<ApiResponse<ConvocatoriaResponse>> crear(
            @Valid @RequestBody ConvocatoriaRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        Long idUsuario = resolverIdUsuario(auth.getName());
        ConvocatoriaResponse response = convService.crear(request, auth.getName(), idUsuario, httpReq);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, response.getMensaje()));
    }

    // ══════════════════════════════════════════════════════════════
    // E10 — POST /convocatorias/{id}/cronograma
    // ══════════════════════════════════════════════════════════════

    @GetMapping("/{id}/cronograma")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'COMITE')")
    @Operation(summary = "Listar cronograma de actividades",
            description = "E10: Obtiene las actividades registradas del cronograma (máx. 5, una por etapa)")
    public ResponseEntity<ApiResponse<List<ActividadCronogramaResponse>>> listarCronograma(@PathVariable Long id) {
        List<ActividadCronogramaResponse> actividades = convService.listarCronograma(id);
        return ResponseEntity.ok(ApiResponse.ok(actividades));
    }

    @PostMapping("/{id}/cronograma")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "E10: Registrar cronograma de actividades",
            description = "CU-06: Registrar etapas, fechas, responsables y lugares. Máximo una actividad por etapa.")
    public ResponseEntity<ApiResponse<CronogramaResponse>> registrarCronograma(
            @PathVariable Long id,
            @Valid @RequestBody CronogramaRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        CronogramaResponse response = convService.registrarCronograma(
                id, request, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMensaje()));
    }

    // ══════════════════════════════════════════════════════════════
    // E11 — POST /convocatorias/{id}/comite
    // ══════════════════════════════════════════════════════════════

    @PostMapping("/{id}/comite")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "E11: Registrar comité de selección",
            description = "CU-07: Registrar resolución, miembros (mín. 3) y notificar")
    public ResponseEntity<ApiResponse<ComiteResponse>> registrarComite(
            @PathVariable Long id,
            @Valid @RequestBody ComiteRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        ComiteResponse response = convService.registrarComite(
                id, request, auth.getName(), httpReq);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, response.getMensaje()));
    }

    

    // ══════════════════════════════════════════════════════════════
    // GET /convocatorias/{id}/comite — Obtener comité con miembros
    // ══════════════════════════════════════════════════════════════

    @GetMapping("/{id}/comite")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'COMITE')")
    @Operation(summary = "Obtener comité con miembros")
    public ResponseEntity<ApiResponse<ComiteDetalleResponse>> obtenerComite(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(convService.obtenerComite(id)));
    }

    @PostMapping("/{id}/comite/notificar")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "Notificar a Comité — comité conformado",
            description = "ORH notifica a usuarios COMITE. Comité pasa a estado COMITE_CONFORMADO.")
    public ResponseEntity<ApiResponse<Void>> notificarComite(
            @PathVariable Long id,
            Authentication auth, HttpServletRequest httpReq) {
        convService.notificarComiteConformado(id, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(null, "Comité notificado. Los miembros del comité recibirán la notificación."));
    }


    // ══════════════════════════════════════════════════════════════
    // E12 — POST /convocatorias/{id}/factores
    // ══════════════════════════════════════════════════════════════

    @PostMapping("/{id}/factores")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMITE')")
    @Operation(summary = "E12: Registrar factores de evaluación (batch)",
            description = "CU-08: Comité define puntajes, pesos y umbrales por etapa. Alimenta Motor RF-14")
    public ResponseEntity<ApiResponse<FactorEvaluacionResponse>> registrarFactores(
            @PathVariable Long id,
            @Valid @RequestBody FactorEvaluacionRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        FactorEvaluacionResponse response = convService.registrarFactores(
                id, request, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMensaje()));
    }

    @GetMapping("/{id}/factores")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'COMITE')")
    @Operation(summary = "Listar factores de evaluación")
    public ResponseEntity<ApiResponse<List<FactorDetalleResponse>>> listarFactores(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(convService.listarFactores(id)));
    }

    @PostMapping("/{id}/factores/individual")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMITE')")
    @Operation(summary = "Agregar factor individual (máx. 3)")
    public ResponseEntity<ApiResponse<FactorDetalleResponse>> agregarFactor(
            @PathVariable Long id,
            @Valid @RequestBody FactorFactorRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        var factor = convService.agregarFactor(id, request, auth.getName(), httpReq);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(factor));
    }

    @PutMapping("/{id}/factores/{idFactor}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMITE')")
    @Operation(summary = "Actualizar factor de evaluación")
    public ResponseEntity<ApiResponse<FactorDetalleResponse>> actualizarFactor(
            @PathVariable Long id, @PathVariable Long idFactor,
            @Valid @RequestBody FactorFactorRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        var factor = convService.actualizarFactor(id, idFactor, request, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(factor));
    }

    @DeleteMapping("/{id}/factores/{idFactor}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMITE')")
    @Operation(summary = "Eliminar factor de evaluación")
    public ResponseEntity<ApiResponse<Void>> eliminarFactor(
            @PathVariable Long id, @PathVariable Long idFactor,
            Authentication auth, HttpServletRequest httpReq) {
        convService.eliminarFactor(id, idFactor, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(null, "Factor eliminado"));
    }

    // ══════════════════════════════════════════════════════════════
    // POST /convocatorias/{id}/comite/miembros — Agregar miembro
    // ══════════════════════════════════════════════════════════════

    @PostMapping("/{id}/comite/miembros")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "Agregar miembro individual al comité")
    public ResponseEntity<ApiResponse<ComiteDetalleResponse.MiembroItem>> agregarMiembro(
            @PathVariable Long id,
            @Valid @RequestBody MiembroComiteRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        var miembro = convService.agregarMiembro(id, request, auth.getName(), httpReq);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(miembro));
    }

    // ══════════════════════════════════════════════════════════════
    // PUT /convocatorias/{id}/comite/miembros/{idMiembro}
    // ══════════════════════════════════════════════════════════════

    @PutMapping("/{id}/comite/miembros/{idMiembro}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "Actualizar miembro del comité")
    public ResponseEntity<ApiResponse<ComiteDetalleResponse.MiembroItem>> actualizarMiembro(
            @PathVariable Long id, @PathVariable Long idMiembro,
            @Valid @RequestBody MiembroComiteRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        var miembro = convService.actualizarMiembro(id, idMiembro, request, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(miembro));
    }

    // ══════════════════════════════════════════════════════════════
    // DELETE /convocatorias/{id}/comite/miembros/{idMiembro}
    // ══════════════════════════════════════════════════════════════

    @DeleteMapping("/{id}/comite/miembros/{idMiembro}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "Eliminar miembro del comité")
    public ResponseEntity<ApiResponse<Void>> eliminarMiembro(
            @PathVariable Long id, @PathVariable Long idMiembro,
            Authentication auth, HttpServletRequest httpReq) {
        convService.eliminarMiembro(id, idMiembro, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(null, "Miembro eliminado"));
    }
    // ══════════════════════════════════════════════════════════════
    // E11.N — POST /convocatorias/{id}/comite/miembros/{idMiembro}/notificar
    // ══════════════════════════════════════════════════════════════

    @PostMapping("/{id}/comite/miembros/{idMiembro}/notificar")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "E11.N: Notificar miembro individual del comité")
    public ResponseEntity<ApiResponse<Void>> notificarMiembro(
            @PathVariable Long id, @PathVariable Long idMiembro,
            Authentication auth, HttpServletRequest httpReq) {
        convService.notificarMiembro(id, idMiembro, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(null, "Notificación enviada al miembro."));
    }

    // ══════════════════════════════════════════════════════════════
    // E13 — POST /convocatorias/{id}/acta-instalacion
    // ══════════════════════════════════════════════════════════════

    @PostMapping("/{id}/acta-instalacion")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMITE')")
    @Operation(summary = "E13: Generar Acta de Instalación del Comité",
            description = "CU-09: Sistema genera acta PDF. Requiere comité registrado")
    public ResponseEntity<ApiResponse<ActaResponse>> generarActa(
            @PathVariable Long id,
            Authentication auth, HttpServletRequest httpReq) {
        ActaResponse response = convService.generarActaInstalacion(
                id, auth.getName(), httpReq);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, response.getMensaje()));
    }

    // ══════════════════════════════════════════════════════════════
    // E14 — PUT /convocatorias/{id}/acta-instalacion/cargar
    // ══════════════════════════════════════════════════════════════

    @GetMapping("/{id}/acta-instalacion")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'COMITE')")
    @Operation(summary = "Obtener metadata del acta de instalación")
    public ResponseEntity<ApiResponse<ActaResponse>> obtenerActa(@PathVariable Long id) {
        ActaResponse acta = convService.obtenerActa(id);
        return ResponseEntity.ok(ApiResponse.ok(acta));
    }

    @GetMapping("/{id}/acta-instalacion/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'COMITE')")
    @Operation(summary = "Preview/descarga del PDF del acta (firmada si existe, generada si no)")
    public ResponseEntity<Resource> descargarActaPdf(@PathVariable Long id) {
        String ruta = convService.obtenerRutaActaPdf(id);
        Path path = Path.of(ruta);
        if (!Files.exists(path)) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new FileSystemResource(path);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"acta.pdf\"")
                .body(resource);
    }

    @PutMapping("/{id}/acta-instalacion/cargar")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMITE')")
    @Operation(summary = "E14: Cargar Acta de Instalación firmada",
            description = "CU-09: Recibe multipart/form-data con PDF firmado escaneado. Almacena en sistema de archivos local.")
    public ResponseEntity<ApiResponse<ActaResponse>> cargarActaFirmada(
            @PathVariable Long id,
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam(value = "fechaFirma", required = false) LocalDate fechaFirma,
            Authentication auth, HttpServletRequest httpReq) {

        // Almacenamiento físico con streaming (CLAUDE.md: no byte[] para archivos > 1MB)
        String nombreSanitizado = UUID.randomUUID() + ".pdf";
        Path uploadDir = Path.of("actas", "firmados");
        try {
            Files.createDirectories(uploadDir);
            try (InputStream is = archivo.getInputStream()) {
                Files.copy(is, uploadDir.resolve(nombreSanitizado), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (Exception e) {
            throw new pe.gob.acffaa.sisconv.domain.exception.DomainException("Error al guardar el archivo: " + e.getMessage());
        }

        String rutaArchivo = "actas/firmados/" + nombreSanitizado;
        ActaResponse response = convService.cargarActaFirmada(
                id, rutaArchivo, fechaFirma, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMensaje()));
    }

    // ══════════════════════════════════════════════════════════════
    // E14-NOTIF — POST /convocatorias/{id}/notificar-acta-orh
    // ══════════════════════════════════════════════════════════════

    @PostMapping("/{id}/notificar-acta-orh")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMITE')")
    @Operation(summary = "E14-NOTIF: COMITÉ notifica a ORH que el acta está firmada y lista para publicar")
    public ResponseEntity<ApiResponse<ConvocatoriaResponse>> notificarActaOrh(
            @PathVariable Long id,
            Authentication auth, HttpServletRequest httpReq) {
        ConvocatoriaResponse response = convService.notificarActaOrh(id, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(response, "Notificación enviada a ORH correctamente"));
    }

    // ══════════════════════════════════════════════════════════════
    // E15 — PUT /convocatorias/{id}/aprobar
    // ══════════════════════════════════════════════════════════════

    @PutMapping("/{id}/aprobar")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "E15: Aprobar y publicar convocatoria",
            description = "CU-10: Publicación SIMULTÁNEA Portal ACFFAA + Talento Perú. D.S. 065-2011-PCM")
    public ResponseEntity<ApiResponse<ConvocatoriaResponse>> aprobar(
            @PathVariable Long id,
            @Valid @RequestBody AprobarConvocatoriaRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        Long idUsuario = resolverIdUsuario(auth.getName());
        ConvocatoriaResponse response = convService.aprobar(
                id, request, auth.getName(), idUsuario, httpReq);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMensaje()));
    }

    // ══════════════════════════════════════════════════════════════
    // Iniciar Selección — POST /convocatorias/{id}/iniciar-seleccion
    // ══════════════════════════════════════════════════════════════

    @PostMapping("/{id}/iniciar-seleccion")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "Iniciar proceso de selección",
            description = "Transición PUBLICADA → EN_SELECCION. Registrada en auditoría.")
    public ResponseEntity<ApiResponse<ConvocatoriaResponse>> iniciarSeleccion(
            @PathVariable Long id,
            Authentication auth, HttpServletRequest httpReq) {
        ConvocatoriaResponse response = convService.iniciarSeleccion(id, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(response, response.getMensaje()));
    }

    // ══════════════════════════════════════════════════════════════
    // E16 — GET /convocatorias/{id}/bases-pdf
    // ══════════════════════════════════════════════════════════════

    @GetMapping("/{id}/bases-pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "E16: Generar bases de convocatoria en PDF",
            description = "CU-11: Consolida perfil, cronograma, factores, pesos, bases legales")
    public ResponseEntity<byte[]> generarBasesPdf(@PathVariable Long id) {
        byte[] pdf = convService.generarBasesPdf(id);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("BASES-" + id + ".pdf")
                .build());

        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    // ══════════════════════════════════════════════════════════════
    // Listados auxiliares
    // ══════════════════════════════════════════════════════════════

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'COMITE')")
    @Operation(summary = "Listar convocatorias",
            description = "Listado paginado con filtro por estado BPMN")
    public ResponseEntity<ApiResponse<Page<ConvocatoriaResponse>>> listar(
            @RequestParam(required = false) String estado,
            @PageableDefault(size = 10, sort = "fechaCreacion") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(convService.listar(estado, pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH', 'COMITE')")
    @Operation(summary = "Obtener convocatoria por ID",
            description = "Detalle completo con requerimiento asociado")
    public ResponseEntity<ApiResponse<ConvocatoriaResponse>> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(convService.obtenerPorId(id)));
    }

    // ══════════════════════════════════════════════════════════════
    // PUT /convocatorias/{id} — Actualizar datos editables por ORH
    // ══════════════════════════════════════════════════════════════

    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORH')")
    @Operation(summary = "Actualizar datos de convocatoria",
            description = "ORH puede editar descripcion y objetoContratacion. Datos heredados del requerimiento son ignorados.")
    public ResponseEntity<ApiResponse<ConvocatoriaResponse>> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody ConvocatoriaUpdateRequest request,
            Authentication auth, HttpServletRequest httpReq) {
        ConvocatoriaResponse response = convService.actualizar(id, request, auth.getName(), httpReq);
        return ResponseEntity.ok(ApiResponse.ok(response, "Se actualizó correctamente"));
    }

    // ══════════════════════════════════════════════════════════════
    // Endpoint público — ETAPA6 B5 (sin autenticación)
    // ══════════════════════════════════════════════════════════════

    @GetMapping("/publicas/{id}/bases-pdf")
    @Operation(summary = "Descarga pública de bases PDF",
            description = "Sin autenticación. Solo disponible para convocatorias PUBLICADAS, EN_SELECCION o FINALIZADAS. "
                        + "Cubierto por permitAll() de SecurityConfig en /convocatorias/publicas/**.")
    public ResponseEntity<byte[]> descargarBasesPdfPublico(@PathVariable Long id) {
        byte[] pdf = convService.generarBasesPdfPublico(id);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("BASES-CAS-" + id + ".pdf")
                .build());

        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    @GetMapping("/publicas/{id}/resultados-curricular-pdf")
    @Operation(summary = "Descarga pública de resultados evaluación curricular",
            description = "Sin autenticación. Solo disponible cuando E24 ya fue ejecutado (existen APTO/NO_APTO).")
    public ResponseEntity<byte[]> descargarResultadosCurricularPdfPublico(@PathVariable Long id) {
        byte[] pdf = convService.generarResultadosCurricularPdfPublico(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("RESULT-CURRICULAR-" + id + ".pdf")
                .build());
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    @GetMapping("/publicas/{id}/resultados-tecnica-pdf")
    @Operation(summary = "Descarga pública de resultados evaluación técnica",
            description = "Sin autenticación. Solo disponible cuando el COMITÉ publicó los resultados E26.")
    public ResponseEntity<byte[]> descargarResultadosTecnicaPdfPublico(@PathVariable Long id) {
        byte[] pdf = convService.generarResultadosTecnicaPdfPublico(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("RESULT-TECNICA-" + id + ".pdf")
                .build());
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    @GetMapping("/publicas/{id}/resultados-pdf")
    @Operation(summary = "Descarga pública de resultado final",
            description = "Sin autenticación. Solo disponible cuando la convocatoria está FINALIZADA (E31).")
    public ResponseEntity<byte[]> descargarResultadosFinalPdfPublico(@PathVariable Long id) {
        byte[] pdf = convService.generarResultadosFinalPdfPublico(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("RESULTADO-FINAL-" + id + ".pdf")
                .build());
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    @GetMapping("/publicas/{id}/resultados-entrevista-pdf")
    @Operation(summary = "Descarga pública de resultados entrevista",
            description = "Sin autenticación. Solo disponible cuando ORH publicó los resultados E27.")
    public ResponseEntity<byte[]> descargarResultadosEntrevistaPdfPublico(@PathVariable Long id) {
        byte[] pdf = convService.generarResultadosEntrevistaPdfPublico(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("RESULT-ENTREVISTA-" + id + ".pdf")
                .build());
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    @GetMapping("/publicas")
    @Operation(summary = "Listado público de convocatorias",
            description = "ETAPA6 B5: Tabla tipo Defensoría — convocatorias PUBLICADAS/EN_SELECCION/FINALIZADAS. Sin autenticación.")
    public ResponseEntity<ApiResponse<Page<ConvocatoriaPublicaResponse>>> listarPublicas(
            @RequestParam(required = false) Integer anio,
            @PageableDefault(size = 20, sort = "fechaPublicacion") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(convService.listarPublicas(anio, pageable)));
    }
    // ══════════════════════════════════════════════════════════════
    // Utilidades
    // ══════════════════════════════════════════════════════════════

    private Long resolverIdUsuario(String username) {
        Usuario usuario = usuarioRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", 0L));
        return usuario.getIdUsuario();
    }
}
