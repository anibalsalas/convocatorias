package pe.gob.acffaa.sisconv.service;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.mapper.ContratoMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.service.ContratoService;
import pe.gob.acffaa.sisconv.domain.enums.EstadoContrato;
import pe.gob.acffaa.sisconv.domain.exception.*;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.domain.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * ContratoServiceTest — PKG-04 Etapa 4: E32-E37.
 * 20 tests: happy path (6) + errores/validaciones (8) + statechart (6).
 *
 * Coherencia verificada contra:
 * - DiagramaFlujo_04 (BPMN 4.1-4.8, 3 Gateways, 2 Fins)
 * - Endpoints_DTOs_v2 §5 (E32-E37 request/response)
 * - AF §6.2 (RN-20 a RN-26)
 * - DDL_05_contrato.sql (CK_CONTRATO_ESTADO, CK_CONTRATO_PROCESO)
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PKG-04: ContratoService Tests (E32-E37)")
class ContratoServiceTest {

    @Mock private IContratoCasRepository contratoRepo;
    @Mock private IVerificacionDocumentoRepository verifDocRepo;
    @Mock private INotificacionRepository notifRepo;
    @Mock private IConvocatoriaRepository convRepo;
    @Mock private IPostulacionRepository postRepo;
    @Mock private ICuadroMeritosRepository meritoRepo;
    @Mock private IExpedienteVirtualRepository expedienteRepo;
    @Mock private IUsuarioRepository usuarioRepo;
    @Mock private IAuditPort audit;
    @Mock private HttpServletRequest http;

    @InjectMocks private ContratoService service;
    private ContratoMapper mapper = new ContratoMapper();

    @BeforeEach
    void setUp() {
        service = new ContratoService(contratoRepo, verifDocRepo, notifRepo, convRepo,
                postRepo, meritoRepo, expedienteRepo, usuarioRepo, audit, mapper);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin_test", null, List.of()));
        lenient().when(usuarioRepo.findByUsername(anyString())).thenReturn(Optional.empty());
        lenient().when(usuarioRepo.findByEmail(anyString())).thenReturn(Optional.empty());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ══════════════════════════════════════════════════════════════
    //  Helpers
    // ══════════════════════════════════════════════════════════════

    private Convocatoria convMock() {
        Requerimiento req = Requerimiento.builder().idRequerimiento(1L).cantidadPuestos(1).build();
        return Convocatoria.builder().idConvocatoria(1L).numeroConvocatoria("CAS-001-2026")
                .estado("EN_SELECCION").anio(2026).requerimiento(req).build();
    }

    private Postulante postulanteMock() {
        return Postulante.builder().idPostulante(10L).nombres("Pedro")
                .apellidoPaterno("Quispe").apellidoMaterno("Mamani")
                .email("pedro.quispe@gmail.com").tipoDocumento("DNI")
                .numeroDocumento("12345678").build();
    }

    private Postulacion postGanador() {
        return Postulacion.builder().idPostulacion(100L)
                .convocatoria(convMock()).postulante(postulanteMock())
                .estado("GANADOR").resultado("GANADOR").ordenMerito(1).build();
    }

    private Postulacion postAccesitario(int orden) {
        Postulante p = Postulante.builder().idPostulante(20L).nombres("Ana")
                .apellidoPaterno("Torres").apellidoMaterno("Ramos")
                .email("ana.torres@gmail.com").build();
        return Postulacion.builder().idPostulacion(200L)
                .convocatoria(convMock()).postulante(p)
                .estado("ACCESITARIO").resultado("ACCESITARIO").ordenMerito(orden).build();
    }

    private ContratoCas contratoNotificado() {
        return ContratoCas.builder().idContrato(1L).convocatoria(convMock())
                .postulacion(postGanador()).estado(EstadoContrato.NOTIFICADO.name())
                .procesoEstado("EN_CURSO").esAccesitario("N").ordenConvocado(1)
                .fechaNotificacion(LocalDateTime.now())
                .fechaVencimientoDocs(LocalDate.now().plusDays(5)).build();
    }

    private ContratoCas contratoDocsVerificados() {
        ContratoCas c = contratoNotificado();
        c.setEstado(EstadoContrato.DOCS_VERIFICADOS.name());
        c.setDocsVerificados(true);
        return c;
    }

    private ContratoCas contratoSuscrito() {
        ContratoCas c = contratoDocsVerificados();
        c.setEstado(EstadoContrato.SUSCRITO.name());
        c.setNumeroContrato("CTO-CAS-001-2026");
        c.setFechaSuscripcion(LocalDate.now());
        c.setFechaInicio(LocalDate.of(2026, 4, 1));
        c.setFechaFin(LocalDate.of(2026, 12, 31));
        c.setMontoMensual(new BigDecimal("3500.00"));
        return c;
    }

    private ContratoCas contratoEnPlanilla() {
        ContratoCas c = contratoSuscrito();
        c.setEstado(EstadoContrato.EN_PLANILLA.name());
        c.setNumeroPlanilla("PLAN-2026-00567");
        c.setRegistroPlanilla(true);
        return c;
    }

    private ExpedienteVirtual expedienteMock(Long id) {
        return ExpedienteVirtual.builder().idExpediente(id)
                .postulacion(postGanador()).tipoDocumento("TITULO")
                .nombreArchivo("titulo.pdf").hashSha256("abc123").build();
    }

    private NotificarGanadorRequest reqNotificar() {
        return NotificarGanadorRequest.builder()
                .idConvocatoria(1L).idPostulacion(100L)
                .plazoDocumentosDias(5).mensajeAdicional("Presentar en ORH").build();
    }

    // ══════════════════════════════════════════════════════════════
    //  E32 — notificarGanador (BPMN 4.1)
    // ══════════════════════════════════════════════════════════════

    @Test
    @DisplayName("E32 happy: Notificar ganador → estado NOTIFICADO + notificación creada")
    void e32_notificarGanador_ok() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convMock()));
        when(postRepo.findById(100L)).thenReturn(Optional.of(postGanador()));
        when(contratoRepo.save(any(ContratoCas.class))).thenAnswer(i -> {
            ContratoCas c = i.getArgument(0); c.setIdContrato(1L); return c;
        });

        ContratoResponse r = service.notificarGanador(1L, reqNotificar(), http);

        assertEquals("NOTIFICADO", r.getEstado());
        assertEquals("Pedro Quispe Mamani", r.getPostulante());
        assertTrue(r.getNotificacionEnviada());
        verify(notifRepo).save(any(Notificacion.class));
        verify(audit).registrarConvocatoria(eq(1L), eq("TBL_CONTRATO_CAS"), any(), eq("NOTIFICAR_GANADOR"), isNull(), eq("NOTIFICADO"), eq(http));
    }

    @Test
    @DisplayName("E32 error: Convocatoria inexistente → ResourceNotFoundException")
    void e32_notificarGanador_convNoExiste() {
        when(convRepo.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.notificarGanador(999L, reqNotificar(), http));
    }

    @Test
    @DisplayName("E32 error: Postulación no pertenece a convocatoria → DomainException")
    void e32_notificarGanador_postNoPertenece() {
        Convocatoria otraConv = Convocatoria.builder().idConvocatoria(2L).build();
        Postulacion post = postGanador();
        post.setConvocatoria(otraConv);
        when(convRepo.findById(1L)).thenReturn(Optional.of(convMock()));
        when(postRepo.findById(100L)).thenReturn(Optional.of(post));

        DomainException ex = assertThrows(DomainException.class,
                () -> service.notificarGanador(1L, reqNotificar(), http));
        assertTrue(ex.getMessage().contains("no pertenece"));
    }

    @Test
    @DisplayName("E32 error: Postulante no es GANADOR → DomainException")
    void e32_notificarGanador_noEsGanador() {
        Postulacion post = postGanador();
        post.setEstado("ACCESITARIO");
        when(convRepo.findById(1L)).thenReturn(Optional.of(convMock()));
        when(postRepo.findById(100L)).thenReturn(Optional.of(post));

        DomainException ex = assertThrows(DomainException.class,
                () -> service.notificarGanador(1L, reqNotificar(), http));
        assertTrue(ex.getMessage().contains("GANADOR"));
    }

    // ══════════════════════════════════════════════════════════════
    //  E33 — verificarDocumentos (BPMN 4.4 + Gateway ¿Docs válidos?)
    // ══════════════════════════════════════════════════════════════

    @Test
    @DisplayName("E33 happy: Todos docs conformes → DOCS_VERIFICADOS")
    void e33_verificarDocumentos_todosConformes() {
        ContratoCas contrato = contratoNotificado();
        when(contratoRepo.findById(1L)).thenReturn(Optional.of(contrato));
        when(expedienteRepo.findById(anyLong())).thenReturn(Optional.of(expedienteMock(1L)));
        when(contratoRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        VerificarDocumentosRequest req = VerificarDocumentosRequest.builder()
                .verificaciones(List.of(
                        VerificarDocumentosRequest.VerificacionItem.builder()
                                .idExpediente(1L).tipoDocumento("TITULO")
                                .documentoConforme("S").observacion("OK").build(),
                        VerificarDocumentosRequest.VerificacionItem.builder()
                                .idExpediente(2L).tipoDocumento("CONSTANCIA")
                                .documentoConforme("S").observacion("OK").build()
                )).build();

        VerificacionDocsResponse r = service.verificarDocumentos(1L, req, http);

        assertTrue(r.getDocsVerificados());
        assertEquals(2, r.getTotalDocumentos());
        assertEquals(2, r.getConformes());
        assertEquals(0, r.getNoConformes());
        verify(verifDocRepo, times(2)).save(any(VerificacionDocumento.class));
    }

    @Test
    @DisplayName("E33 gateway NO: Docs no conformes → docsVerificados=false (RN-24)")
    void e33_verificarDocumentos_noConformes() {
        ContratoCas contrato = contratoNotificado();
        when(contratoRepo.findById(1L)).thenReturn(Optional.of(contrato));
        when(expedienteRepo.findById(anyLong())).thenReturn(Optional.of(expedienteMock(1L)));
        when(contratoRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        VerificarDocumentosRequest req = VerificarDocumentosRequest.builder()
                .verificaciones(List.of(
                        VerificarDocumentosRequest.VerificacionItem.builder()
                                .idExpediente(1L).tipoDocumento("TITULO")
                                .documentoConforme("S").build(),
                        VerificarDocumentosRequest.VerificacionItem.builder()
                                .idExpediente(2L).tipoDocumento("CONSTANCIA")
                                .documentoConforme("N").observacion("Copia ilegible").build()
                )).build();

        VerificacionDocsResponse r = service.verificarDocumentos(1L, req, http);

        assertFalse(r.getDocsVerificados());
        assertEquals(1, r.getNoConformes());
    }

    // ══════════════════════════════════════════════════════════════
    //  E34 — suscribir (BPMN 4.6, D.Leg. 1057)
    // ══════════════════════════════════════════════════════════════

    @Test
    @DisplayName("E34 happy: Suscribir contrato → SUSCRITO + número generado")
    void e34_suscribir_ok() {
        ContratoCas contrato = contratoDocsVerificados();
        when(contratoRepo.findById(1L)).thenReturn(Optional.of(contrato));
        when(contratoRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        SuscribirContratoRequest req = SuscribirContratoRequest.builder()
                .fechaInicio(LocalDate.of(2026, 4, 1))
                .fechaFin(LocalDate.of(2026, 12, 31))
                .montoMensual(new BigDecimal("3500.00"))
                .funciones("Análisis y gestión de contrataciones")
                .dependencia("Dirección de Logística").build();

        ContratoResponse r = service.suscribir(1L, req, http);

        assertEquals("SUSCRITO", r.getEstado());
        assertNotNull(r.getNumeroContrato());
        assertTrue(r.getNumeroContrato().startsWith("CTO-CAS-"));
        verify(notifRepo).save(any(Notificacion.class));
    }

    @Test
    @DisplayName("E34 error: fechaFin < fechaInicio → DomainException")
    void e34_suscribir_fechasInvalidas() {
        when(contratoRepo.findById(1L)).thenReturn(Optional.of(contratoDocsVerificados()));

        SuscribirContratoRequest req = SuscribirContratoRequest.builder()
                .fechaInicio(LocalDate.of(2026, 12, 31))
                .fechaFin(LocalDate.of(2026, 1, 1))
                .montoMensual(new BigDecimal("3500.00"))
                .funciones("Funciones").dependencia("Dep").build();

        DomainException ex = assertThrows(DomainException.class,
                () -> service.suscribir(1L, req, http));
        assertTrue(ex.getMessage().contains("fecha fin"));
    }

    // ══════════════════════════════════════════════════════════════
    //  E35 — convocarAccesitario (BPMN 4.5 + Gateway ¿Acepta?)
    // ══════════════════════════════════════════════════════════════

    @Test
    @DisplayName("E35 happy: Convocar accesitario → nuevo contrato NOTIFICADO + esAccesitario=S")
    void e35_convocarAccesitario_ok() {
        ContratoCas contratoActual = contratoNotificado();
        Postulacion accesitario = postAccesitario(2);

        when(contratoRepo.findById(1L)).thenReturn(Optional.of(contratoActual));
        when(contratoRepo.save(any())).thenAnswer(i -> {
            ContratoCas c = i.getArgument(0);
            if (c.getIdContrato() == null) c.setIdContrato(2L);
            return c;
        });
        when(meritoRepo.findByConvocatoriaId(1L)).thenReturn(List.of(
                CuadroMeritos.builder().postulacion(postGanador()).ordenMerito(1).resultado("GANADOR").build(),
                CuadroMeritos.builder().postulacion(accesitario).ordenMerito(2).resultado("ACCESITARIO").build()
        ));
        when(contratoRepo.findByPostulacionId(200L)).thenReturn(Optional.empty());
        when(postRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        ConvocarAccesitarioRequest req = ConvocarAccesitarioRequest.builder()
                .motivoConvocatoria("Ganador no presentó documentos").build();

        ContratoResponse r = service.convocarAccesitario(1L, req, http);

        assertEquals("NOTIFICADO", r.getEstado());
        assertTrue(r.getEsAccesitario());
        assertEquals(2, r.getOrdenConvocado());
        verify(notifRepo).save(any(Notificacion.class));
    }

    @Test
    @DisplayName("E35 error: Sin accesitarios disponibles → DomainException (usar E37 DESIERTO)")
    void e35_convocarAccesitario_sinAccesitarios() {
        ContratoCas contratoActual = contratoNotificado();
        when(contratoRepo.findById(1L)).thenReturn(Optional.of(contratoActual));
        when(contratoRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(meritoRepo.findByConvocatoriaId(1L)).thenReturn(List.of(
                CuadroMeritos.builder().postulacion(postGanador()).ordenMerito(1).resultado("GANADOR").build()
        ));

        ConvocarAccesitarioRequest req = ConvocarAccesitarioRequest.builder()
                .motivoConvocatoria("No presentó docs").build();

        DomainException ex = assertThrows(DomainException.class,
                () -> service.convocarAccesitario(1L, req, http));
        assertTrue(ex.getMessage().contains("DESIERTO"));
    }

    // ══════════════════════════════════════════════════════════════
    //  E36 — registrarPlanilla (BPMN 4.7, D.S. 018-2007-TR)
    // ══════════════════════════════════════════════════════════════

    @Test
    @DisplayName("E36 happy: Registrar planilla → EN_PLANILLA")
    void e36_registrarPlanilla_ok() {
        when(contratoRepo.findById(1L)).thenReturn(Optional.of(contratoSuscrito()));
        when(contratoRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        RegistrarPlanillaRequest req = RegistrarPlanillaRequest.builder()
                .numeroPlanilla("PLAN-2026-00567")
                .fechaRegistro(LocalDate.of(2026, 3, 28)).build();

        PlanillaResponse r = service.registrarPlanilla(1L, req, http);

        assertTrue(r.getRegistroPlanilla());
        assertEquals("PLAN-2026-00567", r.getNumeroPlanilla());
    }

    // ══════════════════════════════════════════════════════════════
    //  E37 — cerrar (BPMN 4.8 FINALIZADO + DESIERTO)
    // ══════════════════════════════════════════════════════════════

    @Test
    @DisplayName("E37 happy FINALIZADO: Cerrar proceso → CERRADO/FINALIZADO + notificaciones")
    void e37_cerrar_finalizado() {
        when(contratoRepo.findById(1L)).thenReturn(Optional.of(contratoEnPlanilla()));
        when(contratoRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(postRepo.findByConvocatoriaIdAndEstado(eq(1L), eq("GANADOR")))
                .thenReturn(List.of(postGanador()));
        when(postRepo.findByConvocatoriaIdAndEstado(eq(1L), eq("ACCESITARIO")))
                .thenReturn(List.of());

        CerrarProcesoRequest req = CerrarProcesoRequest.builder()
                .procesoEstado("FINALIZADO")
                .observaciones("Proceso completado exitosamente").build();

        ContratoResponse r = service.cerrar(1L, req, http);

        assertEquals("CERRADO", r.getEstado());
        assertEquals("FINALIZADO", r.getProcesoEstado());
        assertTrue(r.getResultadosPublicados());
        assertTrue(r.getNotificacionesEnviadas());
        verify(notifRepo, atLeastOnce()).save(any(Notificacion.class));
    }

    @Test
    @DisplayName("E37 happy DESIERTO: Cerrar como DESIERTO → CERRADO/DESIERTO (RN-21)")
    void e37_cerrar_desierto() {
        ContratoCas contrato = contratoNotificado();
        when(contratoRepo.findById(1L)).thenReturn(Optional.of(contrato));
        when(contratoRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(postRepo.findByConvocatoriaIdAndEstado(anyLong(), anyString()))
                .thenReturn(List.of());

        CerrarProcesoRequest req = CerrarProcesoRequest.builder()
                .procesoEstado("DESIERTO")
                .observaciones("Ningún accesitario aceptó").build();

        ContratoResponse r = service.cerrar(1L, req, http);

        assertEquals("CERRADO", r.getEstado());
        assertEquals("DESIERTO", r.getProcesoEstado());
    }

    // ══════════════════════════════════════════════════════════════
    //  STATECHART: Transiciones válidas e inválidas
    // ══════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Statechart: NOTIFICADO → DOCS_VERIFICADOS ✅")
    void statechart_notificado_a_docsVerificados() {
        assertTrue(EstadoContrato.NOTIFICADO.puedeTransicionarA(EstadoContrato.DOCS_VERIFICADOS));
    }

    @Test
    @DisplayName("Statechart: DOCS_VERIFICADOS → SUSCRITO ✅")
    void statechart_docsVerificados_a_suscrito() {
        assertTrue(EstadoContrato.DOCS_VERIFICADOS.puedeTransicionarA(EstadoContrato.SUSCRITO));
    }

    @Test
    @DisplayName("Statechart: SUSCRITO → EN_PLANILLA ✅")
    void statechart_suscrito_a_enPlanilla() {
        assertTrue(EstadoContrato.SUSCRITO.puedeTransicionarA(EstadoContrato.EN_PLANILLA));
    }

    @Test
    @DisplayName("Statechart: EN_PLANILLA → CERRADO ✅")
    void statechart_enPlanilla_a_cerrado() {
        assertTrue(EstadoContrato.EN_PLANILLA.puedeTransicionarA(EstadoContrato.CERRADO));
    }

    @Test
    @DisplayName("Statechart: NOTIFICADO → SUSCRITO ❌ (salt paso)")
    void statechart_notificado_a_suscrito_invalido() {
        assertFalse(EstadoContrato.NOTIFICADO.puedeTransicionarA(EstadoContrato.SUSCRITO));
    }

    @Test
    @DisplayName("Statechart: CERRADO → cualquiera ❌ (terminal)")
    void statechart_cerrado_terminal() {
        assertFalse(EstadoContrato.CERRADO.puedeTransicionarA(EstadoContrato.NOTIFICADO));
        assertFalse(EstadoContrato.CERRADO.puedeTransicionarA(EstadoContrato.SUSCRITO));
        assertFalse(EstadoContrato.CERRADO.puedeTransicionarA(EstadoContrato.CERRADO));
    }

    @Test
    @DisplayName("Statechart integrado: Suscribir desde NOTIFICADO → DomainException")
    void statechart_suscribirDesdeNotificado_falla() {
        when(contratoRepo.findById(1L)).thenReturn(Optional.of(contratoNotificado()));

        SuscribirContratoRequest req = SuscribirContratoRequest.builder()
                .fechaInicio(LocalDate.of(2026, 4, 1)).fechaFin(LocalDate.of(2026, 12, 31))
                .montoMensual(new BigDecimal("3500")).funciones("F").dependencia("D").build();

        DomainException ex = assertThrows(DomainException.class,
                () -> service.suscribir(1L, req, http));
        assertTrue(ex.getMessage().contains("Transición de estado no permitida"));
    }

    @Test
    @DisplayName("Statechart integrado: Registrar planilla desde NOTIFICADO → DomainException")
    void statechart_planillaDesdeNotificado_falla() {
        when(contratoRepo.findById(1L)).thenReturn(Optional.of(contratoNotificado()));

        RegistrarPlanillaRequest req = RegistrarPlanillaRequest.builder()
                .numeroPlanilla("PLAN-001").fechaRegistro(LocalDate.now()).build();

        DomainException ex = assertThrows(DomainException.class,
                () -> service.registrarPlanilla(1L, req, http));
        assertTrue(ex.getMessage().contains("Transición de estado no permitida"));
    }
}
