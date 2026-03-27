package pe.gob.acffaa.sisconv.application.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import pe.gob.acffaa.sisconv.application.dto.request.AprobarPerfilRequest;
import pe.gob.acffaa.sisconv.application.dto.request.PerfilPuestoRequest;
import pe.gob.acffaa.sisconv.application.dto.request.ValidarPerfilRequest;
import pe.gob.acffaa.sisconv.application.dto.response.NivelPuestoResponse;
import pe.gob.acffaa.sisconv.application.dto.response.PerfilPuestoContextResponse;
import pe.gob.acffaa.sisconv.application.dto.response.PerfilPuestoResponse;
import pe.gob.acffaa.sisconv.application.mapper.PerfilPuestoMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.domain.repository.IAreaOrganizacionalRepository;
import pe.gob.acffaa.sisconv.domain.repository.INivelPuestoRepository;
import pe.gob.acffaa.sisconv.domain.repository.IPerfilPuestoRepository;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;
import pe.gob.acffaa.sisconv.infrastructure.persistence.JpaRequerimientoRepository;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class PerfilPuestoService {

    private static final Set<String> ESTADOS_REQUERIMIENTO_VIGENTES = Set.of(
            "ELABORADO", "CON_PRESUPUESTO", "CONFIGURADO"
    );

    private final IPerfilPuestoRepository perfilRepo;
    private final INivelPuestoRepository nivelPuestoRepo;
    private final PerfilPuestoMapper mapper;
    private final IAuditPort auditPort;
    private final JpaRequerimientoRepository requerimientoRepo;
    private final NotificacionService notificacionService;
    private final IUsuarioRepository usuarioRepository;
    private final IAreaOrganizacionalRepository areaRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public PerfilPuestoService(
            IPerfilPuestoRepository perfilRepo,
            INivelPuestoRepository nivelPuestoRepo,
            PerfilPuestoMapper mapper,
            IAuditPort auditPort,
            JpaRequerimientoRepository requerimientoRepo,
            NotificacionService notificacionService,
            IUsuarioRepository usuarioRepository,
            IAreaOrganizacionalRepository areaRepository
    ) {
        this.perfilRepo = perfilRepo;
        this.nivelPuestoRepo = nivelPuestoRepo;
        this.mapper = mapper;
        this.auditPort = auditPort;
        this.requerimientoRepo = requerimientoRepo;
        this.notificacionService = notificacionService;
        this.usuarioRepository = usuarioRepository;
        this.areaRepository = areaRepository;
    }

    /** Lista catálogo de niveles de puesto para selects (TBL_NIVEL_PUESTO). */
    public List<NivelPuestoResponse> listarNivelesPuesto() {
        return nivelPuestoRepo.findAllOrderByOrden().stream()
                .map(np -> NivelPuestoResponse.builder()
                        .idNivelPuesto(np.getIdNivelPuesto())
                        .codigo(np.getCodigo())
                        .descripcion(np.getDescripcion())
                        .orden(np.getOrden())
                        .build())
                .toList();
    }

    public Page<PerfilPuestoResponse> listar(String estado, Pageable pageable) {
        Page<PerfilPuesto> page = (estado != null && !estado.isBlank())
                ? perfilRepo.findByEstado(estado, pageable)
                : perfilRepo.findAll(pageable);
        return page.map(perfil -> enriquecerConRequerimiento(mapper.toResponse(perfil)));
    }

    public PerfilPuestoResponse obtenerPorId(Long id) {
        PerfilPuesto perfil = perfilRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PerfilPuesto", id));
        return enriquecerConRequerimiento(mapper.toResponse(perfil));
    }

    public PerfilPuestoContextResponse obtenerContextoRegistro(String username) {
        RegistrationContext context = resolveRegistrationContext(username, null);
        return new PerfilPuestoContextResponse(context.idAreaSolicitante(), context.unidadOrganica(), username);
    }

    public long contarPendientesRequerimiento() {
        return perfilRepo.countAprobadosSinRequerimientoVigente();
    }

    /** Cuenta perfiles pendientes de validar o aprobar por ORH (PENDIENTE + VALIDADO). */
    public long contarPendientesValidarAprobar() {
        return perfilRepo.countPendientesValidarAprobar();
    }

    @Transactional
    public void eliminar(Long id, String username) {
        PerfilPuesto perfil = perfilRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PerfilPuesto", id));
        if (!"PENDIENTE".equals(perfil.getEstado())) {
            throw new DomainException("Solo se puede eliminar un perfil en estado PENDIENTE. Estado actual: " + perfil.getEstado());
        }
        perfilRepo.delete(perfil);
    }

    @Transactional
    public PerfilPuestoResponse crear(PerfilPuestoRequest req, String username, HttpServletRequest httpReq) {
        syncRequestWithUserContext(req, username, true);
        trimRequest(req);

        PerfilPuesto perfil = mapper.toEntity(req, username);
        perfil = perfilRepo.save(perfil);

        auditPort.registrar(
                "TBL_PERFIL_PUESTO",
                perfil.getIdPerfilPuesto(),
                "CREAR",
                null,
                "PENDIENTE",
                httpReq,
                "Puesto: " + perfil.getDenominacionPuesto()
        );

        notificacionService.notificarRol(
                "ORH",
                "Nuevo perfil pendiente de validación",
                "El perfil '" + perfil.getDenominacionPuesto() + "' fue creado por " + username
                        + " y requiere validación contra MPP.",
                username
        );

        return enriquecerConRequerimiento(mapper.toResponse(perfil));
    }

    @Transactional
    public PerfilPuestoResponse actualizar(Long id, PerfilPuestoRequest req, String username, HttpServletRequest httpReq) {
        PerfilPuesto perfil = perfilRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PerfilPuesto", id));

        syncRequestWithUserContext(req, username, false);
        trimRequest(req);

        String estadoAnterior = perfil.getEstado();
        applyCabecera(req, perfil, username);
        replaceFormaciones(req, perfil);
        replaceConocimientos(req, perfil);
        replaceExperiencias(req, perfil);
        replaceRequisitos(req, perfil);
        replaceFunciones(req, perfil);
        // Guarda: condición económica solo editable mientras el requerimiento está en ELABORADO
        if (req.getCondicion() != null) {
            requerimientoRepo
                    .findFirstByPerfilPuesto_IdPerfilPuestoAndEstadoInOrderByFechaCreacionDesc(
                            perfil.getIdPerfilPuesto(), ESTADOS_REQUERIMIENTO_VIGENTES)
                    .ifPresent(requerimiento -> {
                        if (!"ELABORADO".equals(requerimiento.getEstado())) {
                            throw new DomainException(
                                    "Las condiciones económicas solo se pueden modificar mientras el requerimiento está en estado ELABORADO. Estado actual: "
                                            + requerimiento.getEstado());
                        }
                    });
        }
        replaceCondicion(req, perfil);

        perfil = perfilRepo.save(perfil);
        entityManager.flush();

        auditPort.registrar(
                "TBL_PERFIL_PUESTO",
                perfil.getIdPerfilPuesto(),
                "ACTUALIZAR",
                estadoAnterior,
                perfil.getEstado(),
                httpReq,
                "Modificado por: " + username
        );

        return enriquecerConRequerimiento(mapper.toResponse(perfil));
    }

    @Transactional
    public PerfilPuestoResponse validar(Long id, ValidarPerfilRequest req, String username, HttpServletRequest httpReq) {
        PerfilPuesto perfil = perfilRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PerfilPuesto", id));

        if (!"PENDIENTE".equals(perfil.getEstado())) {
            throw new DomainException("Solo se puede validar un perfil en estado PENDIENTE. Estado actual: " + perfil.getEstado());
        }

        String estadoAnterior = perfil.getEstado();
        String estadoNuevo = Boolean.TRUE.equals(req.getCumpleMpp()) ? "VALIDADO" : "RECHAZADO";

        perfil.setEstado(estadoNuevo);
        perfil.setValidadoContraMpp(Boolean.TRUE.equals(req.getCumpleMpp()));
        perfil.setObservaciones(normalizeToNullValue(req.getObservaciones()));
        perfil.setFechaValidacion(LocalDateTime.now());
        perfil.setUsuarioValidacion(username);
        perfil.setUsuarioModificacion(username);
        perfil = perfilRepo.save(perfil);

        auditPort.registrar(
                "TBL_PERFIL_PUESTO",
                perfil.getIdPerfilPuesto(),
                "VALIDAR",
                estadoAnterior,
                estadoNuevo,
                httpReq,
                "cumpleMpp=" + req.getCumpleMpp() + " | Validado por: " + username
        );

        notificacionService.notificarUsuario(
                perfil.getUsuarioCreacion(),
                "Resultado de validación de perfil",
                Boolean.TRUE.equals(req.getCumpleMpp())
                        ? "El perfil '" + perfil.getDenominacionPuesto() + "' fue VALIDADO por ORH."
                        : "El perfil '" + perfil.getDenominacionPuesto() + "' fue RECHAZADO en la validación MPP.",
                username
        );

        return enriquecerConRequerimiento(mapper.toResponse(perfil));
    }

    @Transactional
    public PerfilPuestoResponse aprobar(Long id, AprobarPerfilRequest req, String username, HttpServletRequest httpReq) {
        PerfilPuesto perfil = perfilRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PerfilPuesto", id));

        if (!"VALIDADO".equals(perfil.getEstado())) {
            throw new DomainException("Solo se puede aprobar un perfil en estado VALIDADO. Estado actual: " + perfil.getEstado());
        }

        String estadoAnterior = perfil.getEstado();
        String estadoNuevo = Boolean.TRUE.equals(req.getAprobado()) ? "APROBADO" : "RECHAZADO";

        perfil.setEstado(estadoNuevo);
        perfil.setObservaciones(normalizeToNullValue(req.getObservaciones()));
        perfil.setFechaAprobacion(LocalDateTime.now());
        perfil.setUsuarioAprobacion(username);
        perfil.setUsuarioModificacion(username);
        perfil = perfilRepo.save(perfil);

        auditPort.registrar(
                "TBL_PERFIL_PUESTO",
                perfil.getIdPerfilPuesto(),
                "APROBAR",
                estadoAnterior,
                estadoNuevo,
                httpReq,
                "aprobado=" + req.getAprobado() + " | Aprobado por: " + username
        );

        notificacionService.notificarUsuario(
                perfil.getUsuarioCreacion(),
                "Resultado de aprobación de perfil",
                Boolean.TRUE.equals(req.getAprobado())
                        ? "El perfil '" + perfil.getDenominacionPuesto() + "' fue APROBADO por ORH."
                        : "El perfil '" + perfil.getDenominacionPuesto() + "' fue RECHAZADO en la etapa de aprobación.",
                username
        );

        return enriquecerConRequerimiento(mapper.toResponse(perfil));
    }

    public byte[] generarPdf(Long id) {
        PerfilPuesto perfil = perfilRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PerfilPuesto", id));

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 48, 36);
            PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            Font textFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

            Paragraph title = new Paragraph("PERFIL DE PUESTO CAS — RPE 065-2020-SERVIR", titleFont);
            title.setSpacingAfter(12);
            document.add(title);

            document.add(new Paragraph("1. DATOS GENERALES", sectionFont));
            document.add(buildLabelValueTable(new String[][]{
                    {"Nombre del puesto", defaultText(perfil.getNombrePuesto())},
                    {"Denominación del puesto", defaultText(perfil.getDenominacionPuesto())},
                    {"Nivel del puesto", formatNivelPuesto(perfil.getIdNivelPuesto())},
                    {"Unidad orgánica", defaultText(perfil.getUnidadOrganica())},
                    {"Dependencia jerárquica lineal", defaultText(perfil.getDependenciaJerarquicaLineal())},
                    {"Dependencia funcional", defaultText(perfil.getDependenciaFuncional())},
                    {"Puestos a su cargo", defaultValue(perfil.getPuestosCargo())},
                    {"Cantidad de puestos", defaultValue(perfil.getCantidadPuestos())},
                    {"Misión del puesto", defaultText(perfil.getMisionPuesto())}
            }, labelFont, textFont));

            document.add(new Paragraph("2. FORMACIÓN ACADÉMICA", sectionFont));
            document.add(buildFormacionesTable(perfil, labelFont, textFont));

            document.add(new Paragraph("3. CONOCIMIENTOS", sectionFont));
            document.add(buildConocimientosTable(perfil, labelFont, textFont));

            document.add(new Paragraph("4. EXPERIENCIA", sectionFont));
            document.add(buildExperienciasTable(perfil, labelFont, textFont));

            document.add(new Paragraph("5. TRAZABILIDAD", sectionFont));
            document.add(buildLabelValueTable(new String[][]{
                    {"Estado", defaultText(perfil.getEstado())},
                    {"Validado contra MPP", yesNoLabel(perfil.getValidadoContraMpp())},
                    {"Usuario creación", defaultText(perfil.getUsuarioCreacion())},
                    {"Fecha creación", defaultValue(perfil.getFechaCreacion())},
                    {"Validado por", buildUsuarioFecha(perfil.getUsuarioValidacion(), perfil.getFechaValidacion())},
                    {"Aprobado por", buildUsuarioFecha(perfil.getUsuarioAprobacion(), perfil.getFechaAprobacion())},
                    {"Observaciones", defaultText(perfil.getObservaciones())}
            }, labelFont, textFont));

            document.close();
            return baos.toByteArray();
        } catch (Exception ex) {
            throw new DomainException("No se pudo generar el PDF del perfil: " + ex.getMessage());
        }
    }

    private void applyCabecera(PerfilPuestoRequest req, PerfilPuesto perfil, String username) {
        perfil.setNombrePuesto(req.getNombrePuesto() != null ? req.getNombrePuesto() : perfil.getNombrePuesto());
        perfil.setDenominacionPuesto(req.getDenominacionPuesto());
        perfil.setUnidadOrganica(req.getUnidadOrganica());
        perfil.setIdAreaSolicitante(req.getIdAreaSolicitante());
        perfil.setIdNivelPuesto(req.getIdNivelPuesto());
        perfil.setIdNivelFormacion(req.getIdNivelFormacion() != null ? req.getIdNivelFormacion() : perfil.getIdNivelFormacion());
        perfil.setDependenciaJerarquicaLineal(req.getDependenciaJerarquicaLineal());
        perfil.setDependenciaFuncional(req.getDependenciaFuncional());
        perfil.setPuestosCargo(req.getPuestosCargo());
        if (req.getExperienciaGeneral() != null) {
            perfil.setExperienciaGeneral(req.getExperienciaGeneral());
        }
        if (req.getExperienciaEspecifica() != null) {
            perfil.setExperienciaEspecifica(req.getExperienciaEspecifica());
        }
        if (req.getHabilidades() != null) {
            perfil.setHabilidades(req.getHabilidades());
        }
        if (req.getFormacionAcademica() != null) {
            perfil.setFormacionAcademica(req.getFormacionAcademica());
        }
        if (req.getCursosEspecializacion() != null) {
            perfil.setCursosEspecializacion(req.getCursosEspecializacion());
        }
        if (req.getConocimientosPuesto() != null) {
            perfil.setConocimientosPuesto(req.getConocimientosPuesto());
        }
        perfil.setMisionPuesto(req.getMisionPuesto());
        perfil.setCantidadPuestos(req.getCantidadPuestos() != null ? req.getCantidadPuestos() : 1);
        perfil.setUsuarioModificacion(username);
    }

    private void syncRequestWithUserContext(PerfilPuestoRequest request, String username, boolean forceAreaValues) {
        RegistrationContext context = resolveRegistrationContext(username, request);
        if (forceAreaValues || request.getIdAreaSolicitante() == null) {
            request.setIdAreaSolicitante(context.idAreaSolicitante());
        }
        request.setUnidadOrganica(context.unidadOrganica());
    }

    private RegistrationContext resolveRegistrationContext(String username, PerfilPuestoRequest request) {
        if (username != null && !username.isBlank()) {
            Usuario usuario = usuarioRepository.findByUsername(username)
                    .orElseThrow(() -> new DomainException("No se encontró el usuario autenticado para registrar el perfil."));
            if (usuario.getIdArea() == null) {
                throw new DomainException("El usuario autenticado no tiene un área organizacional asociada.");
            }
            AreaOrganizacional area = areaRepository.findById(usuario.getIdArea())
                    .orElseThrow(() -> new DomainException("No se encontró el área organizacional del usuario autenticado."));
            return new RegistrationContext(area.getIdArea(), normalizeAreaLabel(area.getNombreArea()));
        }

        if (request != null && request.getIdAreaSolicitante() != null && request.getUnidadOrganica() != null && !request.getUnidadOrganica().isBlank()) {
            return new RegistrationContext(request.getIdAreaSolicitante(), normalizeAreaLabel(request.getUnidadOrganica()));
        }

        throw new DomainException("No se pudo resolver el área solicitante para registrar el perfil de puesto.");
    }

    private void replaceFormaciones(PerfilPuestoRequest req, PerfilPuesto perfil) {
        if (req.getFormacionesAcademicas() == null) {
            return;
        }
        perfil.getFormacionesAcademicas().clear();
        req.getFormacionesAcademicas().forEach(item -> perfil.getFormacionesAcademicas().add(PerfilFormacionAcademica.builder()
                .perfilPuesto(perfil)
                .gradoAcademico(item.getGradoAcademico())
                .especialidad(item.getEspecialidad())
                .requiereColegiatura(Boolean.TRUE.equals(item.getRequiereColegiatura()))
                .requiereHabilitacionProfesional(Boolean.TRUE.equals(item.getRequiereHabilitacionProfesional()))
                .orden(item.getOrden() != null ? item.getOrden() : perfil.getFormacionesAcademicas().size() + 1)
                .build()));
    }

    private void replaceConocimientos(PerfilPuestoRequest req, PerfilPuesto perfil) {
        if (req.getConocimientos() == null) {
            return;
        }
        perfil.getConocimientos().clear();
        req.getConocimientos().forEach(item -> perfil.getConocimientos().add(PerfilConocimiento.builder()
                .perfilPuesto(perfil)
                .tipoConocimiento(item.getTipoConocimiento())
                .descripcion(item.getDescripcion())
                .horas(item.getHoras())
                .nivelDominio(item.getNivelDominio())
                .orden(item.getOrden() != null ? item.getOrden() : perfil.getConocimientos().size() + 1)
                .build()));
    }

    private void replaceExperiencias(PerfilPuestoRequest req, PerfilPuesto perfil) {
        if (req.getExperiencias() == null) {
            return;
        }
        perfil.getExperiencias().clear();
        req.getExperiencias().forEach(item -> perfil.getExperiencias().add(PerfilExperiencia.builder()
                .perfilPuesto(perfil)
                .tipoExperiencia(item.getTipoExperiencia())
                .cantidad(item.getCantidad())
                .unidadTiempo(item.getUnidadTiempo())
                .nivelMinimoPuesto(item.getNivelMinimoPuesto())
                .detalle(item.getDetalle())
                .orden(item.getOrden() != null ? item.getOrden() : perfil.getExperiencias().size() + 1)
                .build()));
    }

    private void replaceRequisitos(PerfilPuestoRequest req, PerfilPuesto perfil) {
        if (req.getRequisitos() == null) {
            return;
        }
        perfil.getRequisitos().clear();
        req.getRequisitos().forEach(r -> perfil.getRequisitos().add(RequisitoPerfil.builder()
                .idTipoRequisito(r.getIdTipoRequisito())
                .descripcion(normalizeToNullValue(r.getDescripcion()))
                .esObligatorio(r.getEsObligatorio() != null ? r.getEsObligatorio() : "S")
                .orden(r.getOrden() != null ? r.getOrden() : 0)
                .perfilPuesto(perfil)
                .build()));
    }

    private void replaceFunciones(PerfilPuestoRequest req, PerfilPuesto perfil) {
        if (req.getFunciones() == null) {
            return;
        }
        perfil.getFunciones().clear();
        req.getFunciones().forEach(f -> perfil.getFunciones().add(FuncionPuesto.builder()
                .descripcionFuncion(normalizeToNullValue(f.getDescripcionFuncion()))
                .orden(f.getOrden() != null ? f.getOrden() : 0)
                .perfilPuesto(perfil)
                .build()));
    }

    private void replaceCondicion(PerfilPuestoRequest req, PerfilPuesto perfil) {
        if (req.getCondicion() == null) {
            return;
        }
        if (perfil.getCondicion() != null) {
            perfil.getCondicion().setRemuneracionMensual(req.getCondicion().getRemuneracionMensual());
            perfil.getCondicion().setDuracionContrato(normalizeToNullValue(req.getCondicion().getDuracionContrato()));
            perfil.getCondicion().setLugarPrestacion(normalizeToNullValue(req.getCondicion().getLugarPrestacion()));
            perfil.getCondicion().setJornadaSemanal(req.getCondicion().getJornadaSemanal());
            perfil.getCondicion().setOtrasCondiciones(normalizeToNullValue(req.getCondicion().getOtrasCondiciones()));
            // V16: horario, modalidad y tipo de inicio para Bases PDF (E16)
            perfil.getCondicion().setHorarioInicio(req.getCondicion().getHorarioInicio());
            perfil.getCondicion().setHorarioFin(req.getCondicion().getHorarioFin());
            perfil.getCondicion().setDiasLaborales(normalizeToNullValue(req.getCondicion().getDiasLaborales()));
            perfil.getCondicion().setModalidadServicio(req.getCondicion().getModalidadServicio());
            perfil.getCondicion().setTipoInicioContrato(req.getCondicion().getTipoInicioContrato());
            return;
        }
        perfil.setCondicion(CondicionPuesto.builder()
                .remuneracionMensual(req.getCondicion().getRemuneracionMensual())
                .duracionContrato(normalizeToNullValue(req.getCondicion().getDuracionContrato()))
                .lugarPrestacion(normalizeToNullValue(req.getCondicion().getLugarPrestacion()))
                .jornadaSemanal(req.getCondicion().getJornadaSemanal() != null ? req.getCondicion().getJornadaSemanal() : 48)
                .otrasCondiciones(normalizeToNullValue(req.getCondicion().getOtrasCondiciones()))
                // V16: horario, modalidad y tipo de inicio para Bases PDF (E16)
                .horarioInicio(req.getCondicion().getHorarioInicio())
                .horarioFin(req.getCondicion().getHorarioFin())
                .diasLaborales(normalizeToNullValue(req.getCondicion().getDiasLaborales()))
                .modalidadServicio(req.getCondicion().getModalidadServicio())
                .tipoInicioContrato(req.getCondicion().getTipoInicioContrato())
                .perfilPuesto(perfil)
                .build());
    }

    private PerfilPuestoResponse enriquecerConRequerimiento(PerfilPuestoResponse response) {
        if (response == null || response.getIdPerfilPuesto() == null) {
            return response;
        }
        boolean tieneRequerimiento = requerimientoRepo.existsByPerfilPuesto_IdPerfilPuestoAndEstadoIn(
                response.getIdPerfilPuesto(), ESTADOS_REQUERIMIENTO_VIGENTES
        );
        response.setTieneRequerimientoAsociado(tieneRequerimiento);
        if (tieneRequerimiento) {
            Requerimiento requerimiento = requerimientoRepo
                    .findFirstByPerfilPuesto_IdPerfilPuestoAndEstadoInOrderByFechaCreacionDesc(
                            response.getIdPerfilPuesto(), ESTADOS_REQUERIMIENTO_VIGENTES
                    )
                    .orElse(null);
            response.setEstadoRequerimientoAsociado(requerimiento != null ? requerimiento.getEstado() : null);
        } else {
            response.setEstadoRequerimientoAsociado(null);
        }
        return response;
    }

    private PdfPTable buildLabelValueTable(String[][] rows, Font labelFont, Font textFont) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingBefore(4);
        table.setSpacingAfter(10);
        try {
            table.setWidths(new float[]{32f, 68f});
        } catch (DocumentException ignored) {
        }
        for (String[] row : rows) {
            addLabelValueRow(table, row[0], row[1], labelFont, textFont);
        }
        return table;
    }

    private PdfPTable buildFormacionesTable(PerfilPuesto perfil, Font labelFont, Font textFont) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setSpacingBefore(4);
        table.setSpacingAfter(10);
        table.setWidths(new float[]{22f, 38f, 20f, 20f});
        addHeaderCell(table, "Grado académico", labelFont);
        addHeaderCell(table, "Especialidad", labelFont);
        addHeaderCell(table, "Colegiatura", labelFont);
        addHeaderCell(table, "Habilitación", labelFont);

        List<PerfilFormacionAcademica> items = perfil.getFormacionesAcademicas();
        if (items == null || items.isEmpty()) {
            addTextCell(table, defaultText(perfil.getFormacionAcademica()), textFont);
            addTextCell(table, defaultText(perfil.getCursosEspecializacion()), textFont);
            addTextCell(table, "N/A", textFont);
            addTextCell(table, "N/A", textFont);
            return table;
        }

        items.forEach(item -> {
            addTextCell(table, item.getGradoAcademico(), textFont);
            addTextCell(table, item.getEspecialidad(), textFont);
            addTextCell(table, yesNoLabel(item.getRequiereColegiatura()), textFont);
            addTextCell(table, yesNoLabel(item.getRequiereHabilitacionProfesional()), textFont);
        });
        return table;
    }

    private PdfPTable buildConocimientosTable(PerfilPuesto perfil, Font labelFont, Font textFont) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setSpacingBefore(4);
        table.setSpacingAfter(10);
        table.setWidths(new float[]{20f, 44f, 16f, 20f});
        addHeaderCell(table, "Tipo", labelFont);
        addHeaderCell(table, "Descripción", labelFont);
        addHeaderCell(table, "Horas", labelFont);
        addHeaderCell(table, "Nivel dominio", labelFont);

        List<PerfilConocimiento> items = perfil.getConocimientos();
        if (items == null || items.isEmpty()) {
            addTextCell(table, "GENERAL", textFont);
            addTextCell(table, defaultText(perfil.getConocimientosPuesto()), textFont);
            addTextCell(table, "N/A", textFont);
            addTextCell(table, "N/A", textFont);
            return table;
        }

        items.forEach(item -> {
            addTextCell(table, item.getTipoConocimiento(), textFont);
            addTextCell(table, item.getDescripcion(), textFont);
            addTextCell(table, defaultValue(item.getHoras()), textFont);
            addTextCell(table, item.getNivelDominio(), textFont);
        });
        return table;
    }

    private PdfPTable buildExperienciasTable(PerfilPuesto perfil, Font labelFont, Font textFont) throws DocumentException {
        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setSpacingBefore(4);
        table.setSpacingAfter(10);
        table.setWidths(new float[]{18f, 12f, 12f, 18f, 40f});
        addHeaderCell(table, "Tipo", labelFont);
        addHeaderCell(table, "Cantidad", labelFont);
        addHeaderCell(table, "Unidad", labelFont);
        addHeaderCell(table, "Nivel mínimo", labelFont);
        addHeaderCell(table, "Detalle", labelFont);

        List<PerfilExperiencia> items = perfil.getExperiencias();
        if (items == null || items.isEmpty()) {
            addTextCell(table, "GENERAL", textFont);
            addTextCell(table, "N/A", textFont);
            addTextCell(table, "N/A", textFont);
            addTextCell(table, "N/A", textFont);
            addTextCell(table, defaultText(perfil.getExperienciaGeneral()) + " | " + defaultText(perfil.getExperienciaEspecifica()), textFont);
            return table;
        }

        items.forEach(item -> {
            addTextCell(table, item.getTipoExperiencia(), textFont);
            addTextCell(table, defaultValue(item.getCantidad()), textFont);
            addTextCell(table, item.getUnidadTiempo(), textFont);
            addTextCell(table, item.getNivelMinimoPuesto(), textFont);
            addTextCell(table, item.getDetalle(), textFont);
        });
        return table;
    }

    private void addLabelValueRow(PdfPTable table, String label, String value, Font labelFont, Font textFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setPadding(6);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(defaultText(value), textFont));
        valueCell.setPadding(6);
        table.addCell(valueCell);
    }

    private void addHeaderCell(PdfPTable table, String value, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(value, font));
        cell.setPadding(6);
        table.addCell(cell);
    }

    private void addTextCell(PdfPTable table, String value, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(defaultText(value), font));
        cell.setPadding(6);
        table.addCell(cell);
    }

    private void trimRequest(PerfilPuestoRequest request) {
        request.setNombrePuesto(normalizeToNullValue(request.getNombrePuesto()));
        request.setDenominacionPuesto(normalizeToNullValue(request.getDenominacionPuesto()));
        request.setUnidadOrganica(normalizeToNullValue(request.getUnidadOrganica()));
        request.setDependenciaJerarquicaLineal(normalizeToNullValue(request.getDependenciaJerarquicaLineal()));
        request.setDependenciaFuncional(normalizeToNullValue(request.getDependenciaFuncional()));
        request.setExperienciaGeneral(normalizeToNullValue(request.getExperienciaGeneral()));
        request.setExperienciaEspecifica(normalizeToNullValue(request.getExperienciaEspecifica()));
        request.setHabilidades(normalizeToNullValue(request.getHabilidades()));
        request.setFormacionAcademica(normalizeToNullValue(request.getFormacionAcademica()));
        request.setCursosEspecializacion(normalizeToNullValue(request.getCursosEspecializacion()));
        request.setConocimientosPuesto(normalizeToNullValue(request.getConocimientosPuesto()));
        request.setMisionPuesto(normalizeToNullValue(request.getMisionPuesto()));

        if (request.getFormacionesAcademicas() != null) {
            request.getFormacionesAcademicas().forEach(item -> {
                item.setGradoAcademico(normalizeToNullValue(item.getGradoAcademico()));
                item.setEspecialidad(normalizeToNullValue(item.getEspecialidad()));
            });
        }
        if (request.getConocimientos() != null) {
            request.getConocimientos().forEach(item -> {
                item.setTipoConocimiento(normalizeToNullValue(item.getTipoConocimiento()));
                item.setDescripcion(normalizeToNullValue(item.getDescripcion()));
                item.setNivelDominio(normalizeToNullValue(item.getNivelDominio()));
            });
        }
        if (request.getExperiencias() != null) {
            request.getExperiencias().forEach(item -> {
                item.setTipoExperiencia(normalizeToNullValue(item.getTipoExperiencia()));
                item.setUnidadTiempo(normalizeToNullValue(item.getUnidadTiempo()));
                item.setNivelMinimoPuesto(normalizeToNullValue(item.getNivelMinimoPuesto()));
                item.setDetalle(normalizeToNullValue(item.getDetalle()));
            });
        }
    }

    private String normalizeToNullValue(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeAreaLabel(String value) {
        String normalized = normalizeToNullValue(value);
        return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
    }

    private String defaultText(String value) {
        return value != null ? value : "N/A";
    }

    private String defaultValue(Object value) {
        return value != null ? String.valueOf(value) : "N/A";
    }

    private String yesNoLabel(Boolean value) {
        return Boolean.TRUE.equals(value) ? "Sí" : "No";
    }

    private String buildUsuarioFecha(String username, LocalDateTime fecha) {
        if (username == null && fecha == null) {
            return "N/A";
        }
        if (username == null) {
            return defaultValue(fecha);
        }
        if (fecha == null) {
            return username;
        }
        return username + " - " + fecha;
    }

    private String formatNivelPuesto(Long idNivelPuesto) {
        if (idNivelPuesto == null) {
            return "N/A";
        }
        return switch (idNivelPuesto.intValue()) {
            case 1 -> "Especialista";
            case 2 -> "Analista";
            case 3 -> "Asistente";
            case 4 -> "Operativo";
            case 5 -> "P-5";
            case 6 -> "P-6";
            case 7 -> "P-7";
            case 8 -> "P-8";
            default -> "CATÁLOGO #" + idNivelPuesto;
        };
    }

    private record RegistrationContext(Long idAreaSolicitante, String unidadOrganica) {
    }
}
