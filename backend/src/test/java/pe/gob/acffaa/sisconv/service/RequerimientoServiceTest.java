package pe.gob.acffaa.sisconv.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import pe.gob.acffaa.sisconv.application.dto.request.ConfigurarReglasRequest;
import pe.gob.acffaa.sisconv.application.dto.request.ConfigurarReglasRequest.CriterioItem;
import pe.gob.acffaa.sisconv.application.dto.request.RequerimientoRequest;
import pe.gob.acffaa.sisconv.application.dto.request.VerificarPresupuestoRequest;
import pe.gob.acffaa.sisconv.application.dto.response.RequerimientoResponse;
import pe.gob.acffaa.sisconv.application.dto.response.RequerimientoResponse.MotorReglasResumen;
import pe.gob.acffaa.sisconv.application.mapper.RequerimientoMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.service.NotificacionService;
import pe.gob.acffaa.sisconv.application.service.RequerimientoService;
import pe.gob.acffaa.sisconv.domain.enums.EstadoRequerimiento;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.PerfilPuesto;
import pe.gob.acffaa.sisconv.domain.model.ReglaMotor;
import pe.gob.acffaa.sisconv.domain.model.Requerimiento;
import pe.gob.acffaa.sisconv.domain.repository.IConvocatoriaRepository;
import pe.gob.acffaa.sisconv.domain.repository.IPerfilPuestoRepository;
import pe.gob.acffaa.sisconv.domain.repository.IReglaMotorRepository;
import pe.gob.acffaa.sisconv.domain.repository.IRequerimientoRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests unitarios para RequerimientoService — CU-03 (E6), CU-04 (E7), CU-05 (E8).
 *
 * Valida:
 *   E6: Creación con correlativo REQ-YYYY-NNNN y estado ELABORADO
 *   E7: Verificación presupuestal → CON_PRESUPUESTO | SIN_PRESUPUESTO
 *   E8: Configurar Motor RF-14 → CONFIGURADO (pesos=100%, reglas creadas)
 *   Máquina de estados BPMN (EstadoRequerimiento enum)
 *   Auditoría D.L. 1451
 *
 * Coherencia: Endpoints_DTOs_v2 §2, Vista CU (CU-03/04/05), Diagrama Flujo Etapa 1
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RequerimientoService — PKG-01 Flujo BPMN E6/E7/E8")
class RequerimientoServiceTest {

    @Mock private IRequerimientoRepository reqRepo;
    @Mock private IPerfilPuestoRepository perfilRepo;
    @Mock private IReglaMotorRepository reglaRepo;
    @Mock private IConvocatoriaRepository convRepo;
    @Mock private RequerimientoMapper mapper;
    @Mock private IAuditPort auditPort;
    @Mock private NotificacionService notificacionService;

    @InjectMocks
    private RequerimientoService service;

    private PerfilPuesto perfilAprobado;
    private PerfilPuesto perfilPendiente;
    private Requerimiento reqElaborado;
    private Requerimiento reqConPresupuesto;
    private RequerimientoResponse responseMock;

    @BeforeEach
    void setUp() {
        perfilAprobado = PerfilPuesto.builder()
                .idPerfilPuesto(1L)
                .denominacionPuesto("Analista Programador")
                .estado("APROBADO")
                .idAreaSolicitante(4L)
                .build();

        perfilPendiente = PerfilPuesto.builder()
                .idPerfilPuesto(2L)
                .denominacionPuesto("Especialista Legal")
                .estado("PENDIENTE")
                .build();

        reqElaborado = Requerimiento.builder()
                .idRequerimiento(1L)
                .numeroRequerimiento("REQ-2026-0001")
                .idAreaSolicitante(4L)
                .perfilPuesto(perfilAprobado)
                .justificacion("Necesidad de desarrollo de sistemas")
                .cantidadPuestos(1)
                .idUsuarioSolicitante(1L)
                .estado("ELABORADO")
                .usuarioCreacion("admin")
                .fechaSolicitud(LocalDateTime.now())
                .fechaCreacion(LocalDateTime.now())
                .build();

        reqConPresupuesto = Requerimiento.builder()
                .idRequerimiento(1L)
                .numeroRequerimiento("REQ-2026-0001")
                .idAreaSolicitante(4L)
                .perfilPuesto(perfilAprobado)
                .justificacion("Necesidad de desarrollo de sistemas")
                .cantidadPuestos(1)
                .idUsuarioSolicitante(1L)
                .estado("CON_PRESUPUESTO")
                .tienePresupuesto(true)
                .certificacionPresupuestal("CERT-2026-0045")
                .numeroSiaf("SIAF-2026-00123")
                .usuarioCreacion("admin")
                .fechaCreacion(LocalDateTime.now())
                .build();

        responseMock = RequerimientoResponse.builder()
                .idRequerimiento(1L)
                .numeroRequerimiento("REQ-2026-0001")
                .idAreaSolicitante(4L)
                .perfil(RequerimientoResponse.PerfilResumen.builder()
                        .idPerfil(1L).denominacion("Analista Programador").build())
                .cantidadPuestos(1)
                .estado("ELABORADO")
                .tienePresupuesto(false)
                .build();

        lenient().when(reglaRepo.findByIdRequerimiento(anyLong())).thenReturn(List.of());
        lenient().when(convRepo.existsByIdRequerimiento(anyLong())).thenReturn(false);
        lenient().doNothing().when(notificacionService).notificarRol(
                anyString(), anyString(), anyString(), anyString());
        lenient().doNothing().when(notificacionService).notificarUsuario(
                anyLong(), anyString(), anyString(), anyString());
    }

    // ═══════════════════════════════════════════════════════
    // E6: CREAR REQUERIMIENTO — CU-03
    // ═══════════════════════════════════════════════════════

    @Nested
    @DisplayName("E6: Crear requerimiento — CU-03")
    class CrearRequerimiento {

        @Test
        @DisplayName("Debe crear requerimiento con número correlativo REQ-YYYY-NNNN y estado ELABORADO")
        void crear_debeGenerarCorrelativoYEstadoElaborado() {
            RequerimientoRequest request = new RequerimientoRequest();
            request.setIdAreaSolicitante(4L);
            request.setIdPerfilPuesto(1L);
            request.setJustificacion("Necesidad de desarrollo");
            request.setCantidadPuestos(1);

            when(perfilRepo.findById(1L)).thenReturn(Optional.of(perfilAprobado));
            when(reqRepo.countByAnio(anyInt())).thenReturn(0L);
            when(reqRepo.save(any(Requerimiento.class))).thenReturn(reqElaborado);
            when(mapper.toResponse(any(Requerimiento.class))).thenReturn(responseMock);
            doNothing().when(auditPort).registrar(anyString(), anyLong(), anyString(),
                    any(), anyString(), any(), anyString());

            RequerimientoResponse result = service.crear(request, "admin", 1L, null, false);

            assertNotNull(result);
            assertEquals("REQ-2026-0001", result.getNumeroRequerimiento());
            assertEquals("ELABORADO", result.getEstado());
            assertFalse(result.getTienePresupuesto());
            assertEquals(1, result.getCantidadPuestos());
            verify(reqRepo).save(any(Requerimiento.class));
            verify(auditPort).registrar(eq("TBL_REQUERIMIENTO"), eq(1L), eq("CREAR"),
                    isNull(), eq("ELABORADO"), isNull(), contains("REQ-2026-0001"));
        }

        @Test
        @DisplayName("Debe lanzar excepción si perfil de puesto no existe")
        void crear_perfilNoExiste_debeLanzarExcepcion() {
            RequerimientoRequest request = new RequerimientoRequest();
            request.setIdPerfilPuesto(999L);
            request.setIdAreaSolicitante(4L);
            request.setJustificacion("Test");
            request.setCantidadPuestos(1);
            when(perfilRepo.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> service.crear(request, "admin", 1L, null, false));
        }

        @Test
        @DisplayName("CU-03 Precondición: Debe rechazar si perfil NO está APROBADO")
        void crear_perfilNoAprobado_debeLanzarDomainException() {
            RequerimientoRequest request = new RequerimientoRequest();
            request.setIdPerfilPuesto(2L);
            request.setIdAreaSolicitante(4L);
            request.setJustificacion("Test");
            request.setCantidadPuestos(1);
            when(perfilRepo.findById(2L)).thenReturn(Optional.of(perfilPendiente));

            DomainException ex = assertThrows(DomainException.class,
                    () -> service.crear(request, "admin", 1L, null, false));
            assertTrue(ex.getMessage().contains("APROBADO"));
            assertTrue(ex.getMessage().contains("PENDIENTE"));
        }

        @Test
        @DisplayName("E6: Debe rechazar si idAreaSolicitante no coincide con el área del perfil (no ADMIN)")
        void crear_areaSolicitanteNoCoincideConPerfil_debeLanzarDomainException() {
            RequerimientoRequest request = new RequerimientoRequest();
            request.setIdAreaSolicitante(4L);
            request.setIdPerfilPuesto(1L);
            request.setJustificacion("Test");
            request.setCantidadPuestos(1);

            PerfilPuesto perfilOtraArea = PerfilPuesto.builder()
                    .idPerfilPuesto(1L)
                    .denominacionPuesto("Analista Programador")
                    .estado("APROBADO")
                    .idAreaSolicitante(99L)
                    .build();
            when(perfilRepo.findById(1L)).thenReturn(Optional.of(perfilOtraArea));

            DomainException ex = assertThrows(DomainException.class,
                    () -> service.crear(request, "area_user", 1L, null, false));
            assertTrue(ex.getMessage().contains("área solicitante"));
        }

        @Test
        @DisplayName("E6: ADMIN puede omitir la validación de área (coherencia delegada)")
        void crear_adminPuedeOmitirValidacionArea() {
            RequerimientoRequest request = new RequerimientoRequest();
            request.setIdAreaSolicitante(4L);
            request.setIdPerfilPuesto(1L);
            request.setJustificacion("Corrección datos");
            request.setCantidadPuestos(1);

            PerfilPuesto perfilOtraArea = PerfilPuesto.builder()
                    .idPerfilPuesto(1L)
                    .denominacionPuesto("Analista Programador")
                    .estado("APROBADO")
                    .idAreaSolicitante(99L)
                    .build();
            when(perfilRepo.findById(1L)).thenReturn(Optional.of(perfilOtraArea));
            when(reqRepo.countByAnio(anyInt())).thenReturn(0L);
            when(reqRepo.save(any(Requerimiento.class))).thenReturn(reqElaborado);
            when(mapper.toResponse(any(Requerimiento.class))).thenReturn(responseMock);
            doNothing().when(auditPort).registrar(anyString(), anyLong(), anyString(),
                    any(), anyString(), any(), anyString());

            assertDoesNotThrow(() -> service.crear(request, "admin", 1L, null, true));
            verify(reqRepo).save(any(Requerimiento.class));
        }

        @Test
        @DisplayName("Debe generar correlativo incrementando conteo anual")
        void crear_debeIncrementarCorrelativo() {
            RequerimientoRequest request = new RequerimientoRequest();
            request.setIdAreaSolicitante(4L);
            request.setIdPerfilPuesto(1L);
            request.setJustificacion("Segundo requerimiento del año");
            request.setCantidadPuestos(2);

            Requerimiento reqSegundo = Requerimiento.builder()
                    .idRequerimiento(2L)
                    .numeroRequerimiento("REQ-2026-0002")
                    .perfilPuesto(perfilAprobado)
                    .estado("ELABORADO")
                    .cantidadPuestos(2)
                    .build();
            RequerimientoResponse respSegundo = RequerimientoResponse.builder()
                    .idRequerimiento(2L)
                    .numeroRequerimiento("REQ-2026-0002")
                    .estado("ELABORADO")
                    .cantidadPuestos(2)
                    .tienePresupuesto(false)
                    .build();

            when(perfilRepo.findById(1L)).thenReturn(Optional.of(perfilAprobado));
            when(reqRepo.countByAnio(anyInt())).thenReturn(1L);
            when(reqRepo.save(any(Requerimiento.class))).thenReturn(reqSegundo);
            when(mapper.toResponse(any(Requerimiento.class))).thenReturn(respSegundo);
            doNothing().when(auditPort).registrar(anyString(), anyLong(), anyString(),
                    any(), anyString(), any(), anyString());

            RequerimientoResponse result = service.crear(request, "admin", 1L, null, false);

            assertEquals("REQ-2026-0002", result.getNumeroRequerimiento());
            assertEquals(2, result.getCantidadPuestos());
        }
    }

    // ═══════════════════════════════════════════════════════
    // E7: VERIFICAR PRESUPUESTO — CU-04
    // ═══════════════════════════════════════════════════════

    @Nested
    @DisplayName("E7: Verificar presupuesto — CU-04")
    class VerificarPresupuesto {

        @Test
        @DisplayName("E7-OK: existePresupuesto=true → CON_PRESUPUESTO con cert+SIAF")
        void verificar_conPresupuesto_transicionaCorrectamente() {
            VerificarPresupuestoRequest request = new VerificarPresupuestoRequest();
            request.setExistePresupuesto(true);
            request.setCertificacionPresupuestal("CERT-2026-0045");
            request.setNumeroSiaf("SIAF-2026-00123");
            request.setObservaciones("Presupuesto disponible en meta 0045");

            when(reqRepo.findById(1L)).thenReturn(Optional.of(reqElaborado));
            when(reqRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(mapper.toResponse(any())).thenReturn(
                    RequerimientoResponse.builder()
                            .idRequerimiento(1L).estado("CON_PRESUPUESTO")
                            .tienePresupuesto(true)
                            .certificacionPresupuestal("CERT-2026-0045")
                            .build());

            RequerimientoResponse result = service.verificarPresupuesto(
                    1L, request, "opp_user", 3L, null);

            assertNotNull(result);
            verify(reqRepo).save(argThat(r ->
                    "CON_PRESUPUESTO".equals(r.getEstado())
                    && Boolean.TRUE.equals(r.getTienePresupuesto())
                    && "CERT-2026-0045".equals(r.getCertificacionPresupuestal())
                    && "SIAF-2026-00123".equals(r.getNumeroSiaf())
                    && r.getFechaCertPresupuestal() != null
                    && r.getIdUsuarioOpp().equals(3L)));
        }

        @Test
        @DisplayName("E7-OK: existePresupuesto=false → SIN_PRESUPUESTO (terminal)")
        void verificar_sinPresupuesto_estadoTerminal() {
            VerificarPresupuestoRequest request = new VerificarPresupuestoRequest();
            request.setExistePresupuesto(false);
            request.setObservaciones("No hay presupuesto disponible para este ejercicio");

            when(reqRepo.findById(1L)).thenReturn(Optional.of(reqElaborado));
            when(reqRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(mapper.toResponse(any())).thenReturn(
                    RequerimientoResponse.builder().estado("SIN_PRESUPUESTO")
                            .tienePresupuesto(false).build());

            service.verificarPresupuesto(1L, request, "opp_user", 3L, null);

            verify(reqRepo).save(argThat(r ->
                    "SIN_PRESUPUESTO".equals(r.getEstado())
                    && Boolean.FALSE.equals(r.getTienePresupuesto())));
        }

        @Test
        @DisplayName("E7-ERR: existePresupuesto=true sin certificación → DomainException")
        void verificar_sinCertificacion_lanzaExcepcion() {
            VerificarPresupuestoRequest request = new VerificarPresupuestoRequest();
            request.setExistePresupuesto(true);
            // certificacionPresupuestal = null

            when(reqRepo.findById(1L)).thenReturn(Optional.of(reqElaborado));

            assertThrows(DomainException.class, () ->
                    service.verificarPresupuesto(1L, request, "opp", 3L, null));
        }

        @Test
        @DisplayName("E7-ERR: existePresupuesto=true sin SIAF → DomainException")
        void verificar_sinSiaf_lanzaExcepcion() {
            VerificarPresupuestoRequest request = new VerificarPresupuestoRequest();
            request.setExistePresupuesto(true);
            request.setCertificacionPresupuestal("CERT-001");
            // numeroSiaf = null

            when(reqRepo.findById(1L)).thenReturn(Optional.of(reqElaborado));

            assertThrows(DomainException.class, () ->
                    service.verificarPresupuesto(1L, request, "opp", 3L, null));
        }

        @Test
        @DisplayName("E7-ERR: Desde CON_PRESUPUESTO → transición inválida")
        void verificar_desdeConPresupuesto_transicionInvalida() {
            VerificarPresupuestoRequest request = new VerificarPresupuestoRequest();
            request.setExistePresupuesto(true);
            request.setCertificacionPresupuestal("CERT-002");
            request.setNumeroSiaf("SIAF-002");

            when(reqRepo.findById(1L)).thenReturn(Optional.of(reqConPresupuesto));

            assertThrows(DomainException.class, () ->
                    service.verificarPresupuesto(1L, request, "opp", 3L, null));
        }

        @Test
        @DisplayName("E7-ERR: Requerimiento no existe → ResourceNotFoundException")
        void verificar_noExiste_lanzaExcepcion() {
            when(reqRepo.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () ->
                    service.verificarPresupuesto(999L, new VerificarPresupuestoRequest(),
                            "opp", 3L, null));
        }
    }

    // ═══════════════════════════════════════════════════════
    // E8: CONFIGURAR MOTOR DE REGLAS RF-14 — CU-05
    // ═══════════════════════════════════════════════════════

    @Nested
    @DisplayName("E8: Configurar Motor de Reglas — CU-05")
    class ConfigurarReglas {

        private ConfigurarReglasRequest buildValidRequest() {
            ConfigurarReglasRequest req = new ConfigurarReglasRequest();
            req.setPesoEvalCurricular(new BigDecimal("30.00"));
            req.setPesoEvalTecnica(new BigDecimal("35.00"));
            req.setPesoEntrevista(new BigDecimal("35.00"));
            req.setUmbralCurricular(new BigDecimal("60.00"));
            req.setUmbralTecnica(new BigDecimal("50.00"));
            req.setUmbralEntrevista(new BigDecimal("50.00"));
            req.setCriteriosCurriculares(List.of(
                    new CriterioItem("Formación académica", new BigDecimal("30"), new BigDecimal("35")),
                    new CriterioItem("Experiencia general", new BigDecimal("25"), new BigDecimal("25")),
                    new CriterioItem("Experiencia específica", new BigDecimal("30"), new BigDecimal("30")),
                    new CriterioItem("Capacitación", new BigDecimal("15"), new BigDecimal("10"))
            ));
            return req;
        }

        @Test
        @DisplayName("E8-OK: Pesos=100%, 4 criterios → CONFIGURADO + 7 reglas creadas")
        void configurar_requestValido_transicionaYCreaReglas() {
            ConfigurarReglasRequest request = buildValidRequest();

            when(reqRepo.findById(1L)).thenReturn(Optional.of(reqConPresupuesto));
            when(reqRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(reglaRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

            // Mapper returns response with motorReglas
            RequerimientoResponse mockResp = RequerimientoResponse.builder()
                    .idRequerimiento(1L).estado("CONFIGURADO")
                    .motorReglas(MotorReglasResumen.builder()
                            .pesoEvalCurricular(new BigDecimal("30.00"))
                            .pesoEvalTecnica(new BigDecimal("35.00"))
                            .pesoEntrevista(new BigDecimal("35.00"))
                            .totalPesos(new BigDecimal("100.00"))
                            .criteriosRegistrados(4)
                            .build())
                    .build();
            when(mapper.toResponseConMotor(any(), any())).thenReturn(mockResp);

            RequerimientoResponse result = service.configurarReglas(
                    1L, request, "orh_user", 2L, null);

            assertNotNull(result);
            assertEquals("Motor de Reglas configurado. Listo para Etapa 2.", result.getMensaje());
            assertNotNull(result.getMotorReglas());
            assertEquals(new BigDecimal("100.00"), result.getMotorReglas().getTotalPesos());
            assertEquals(4, result.getMotorReglas().getCriteriosRegistrados());

            // Verify 7 reglas: 3 CALCULO + 4 FILTRO
            @SuppressWarnings("unchecked")
            ArgumentCaptor<List<ReglaMotor>> captor = ArgumentCaptor.forClass(List.class);
            verify(reglaRepo).saveAll(captor.capture());
            List<ReglaMotor> reglas = captor.getValue();
            assertEquals(7, reglas.size());

            // 3 primeras son CALCULO
            assertEquals("CALCULO", reglas.get(0).getTipoRegla());
            assertEquals("CURRICULAR", reglas.get(0).getEtapaEvaluacion());
            assertEquals("CALCULO", reglas.get(1).getTipoRegla());
            assertEquals("TECNICA", reglas.get(1).getEtapaEvaluacion());
            assertEquals("CALCULO", reglas.get(2).getTipoRegla());
            assertEquals("ENTREVISTA", reglas.get(2).getEtapaEvaluacion());

            // 4 siguientes son FILTRO
            assertEquals("FILTRO", reglas.get(3).getTipoRegla());
            assertEquals("Formación académica", reglas.get(3).getNombreRegla());

            // Verify estado → CONFIGURADO
            verify(reqRepo).save(argThat(r -> "CONFIGURADO".equals(r.getEstado())));
            // Verify deletes previas
            verify(reglaRepo).deleteByIdRequerimiento(1L);
        }

        @Test
        @DisplayName("E8-OK: Sin criterios curriculares → solo 3 reglas CALCULO")
        void configurar_sinCriteriosCurriculares_soloReglasCalculo() {
            ConfigurarReglasRequest request = buildValidRequest();
            request.setCriteriosCurriculares(List.of());

            when(reqRepo.findById(1L)).thenReturn(Optional.of(reqConPresupuesto));
            when(reqRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(reglaRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

            RequerimientoResponse mockResp = RequerimientoResponse.builder()
                    .idRequerimiento(1L).estado("CONFIGURADO")
                    .motorReglas(MotorReglasResumen.builder()
                            .pesoEvalCurricular(new BigDecimal("30.00"))
                            .pesoEvalTecnica(new BigDecimal("35.00"))
                            .pesoEntrevista(new BigDecimal("35.00"))
                            .totalPesos(new BigDecimal("100.00"))
                            .criteriosRegistrados(0)
                            .build())
                    .build();
            when(mapper.toResponseConMotor(any(), any())).thenReturn(mockResp);

            RequerimientoResponse result = service.configurarReglas(
                    1L, request, "orh_user", 2L, null);

            assertNotNull(result);
            assertEquals("Motor de Reglas configurado. Listo para Etapa 2.", result.getMensaje());
            assertEquals(0, result.getMotorReglas().getCriteriosRegistrados());

            @SuppressWarnings("unchecked")
            ArgumentCaptor<List<ReglaMotor>> captor = ArgumentCaptor.forClass(List.class);
            verify(reglaRepo).saveAll(captor.capture());
            List<ReglaMotor> reglas = captor.getValue();
            assertEquals(3, reglas.size());
            assertEquals("CALCULO", reglas.get(0).getTipoRegla());
            assertEquals("CALCULO", reglas.get(1).getTipoRegla());
            assertEquals("CALCULO", reglas.get(2).getTipoRegla());
            verify(reqRepo).save(argThat(r -> "CONFIGURADO".equals(r.getEstado())));
        }

        @Test
        @DisplayName("E8-ERR: Pesos no suman 100% → DomainException")
        void configurar_pesosNoSuman100_lanzaExcepcion() {
            ConfigurarReglasRequest request = buildValidRequest();
            request.setPesoEntrevista(new BigDecimal("30.00")); // 30+35+30=95

            when(reqRepo.findById(1L)).thenReturn(Optional.of(reqConPresupuesto));

            DomainException ex = assertThrows(DomainException.class, () ->
                    service.configurarReglas(1L, request, "orh", 2L, null));
            assertTrue(ex.getMessage().contains("100.00"));
        }

        @Test
        @DisplayName("E8-ERR: Desde ELABORADO → DomainException (requiere CON_PRESUPUESTO)")
        void configurar_desdeElaborado_transicionInvalida() {
            when(reqRepo.findById(1L)).thenReturn(Optional.of(reqElaborado));

            assertThrows(DomainException.class, () ->
                    service.configurarReglas(1L, buildValidRequest(), "orh", 2L, null));
        }

        @Test
        @DisplayName("E8-ERR: Desde CONFIGURADO → DomainException (estado terminal)")
        void configurar_desdeConfigurado_transicionInvalida() {
            Requerimiento reqConfigurado = Requerimiento.builder()
                    .idRequerimiento(1L).estado("CONFIGURADO").build();
            when(reqRepo.findById(1L)).thenReturn(Optional.of(reqConfigurado));

            assertThrows(DomainException.class, () ->
                    service.configurarReglas(1L, buildValidRequest(), "orh", 2L, null));
        }
    }

    // ═══════════════════════════════════════════════════════
    // CONSULTAS: Listar y Obtener por ID
    // ═══════════════════════════════════════════════════════

    @Nested
    @DisplayName("Consultas: Listar y Obtener por ID")
    class Consultas {

        @Test
        @DisplayName("Debe obtener requerimiento existente por ID")
        void obtenerPorId_existente_debeRetornar() {
            when(reqRepo.findByIdWithProfileAndCondition(1L)).thenReturn(Optional.of(reqElaborado));
            when(mapper.toResponseConMotor(eq(reqElaborado), anyList())).thenReturn(responseMock);

            RequerimientoResponse result = service.obtenerPorId(1L);

            assertNotNull(result);
            assertEquals("REQ-2026-0001", result.getNumeroRequerimiento());
            assertEquals("ELABORADO", result.getEstado());
        }

        @Test
        @DisplayName("Debe lanzar excepción si requerimiento no existe")
        void obtenerPorId_noExistente_debeLanzarExcepcion() {
            when(reqRepo.findByIdWithProfileAndCondition(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> service.obtenerPorId(999L));
        }

        @Test
        @DisplayName("Debe listar requerimientos filtrados por estado ELABORADO")
        void listar_porEstado_debeRetornarFiltrado() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Requerimiento> page = new PageImpl<>(List.of(reqElaborado), pageable, 1);

            when(reqRepo.findByEstado("ELABORADO", pageable)).thenReturn(page);
            when(mapper.toResponseConMotor(any(Requerimiento.class), anyList())).thenReturn(responseMock);

            Page<RequerimientoResponse> result = service.listar("ELABORADO", null, pageable);

            assertEquals(1, result.getTotalElements());
            verify(reqRepo).findByEstado("ELABORADO", pageable);
        }

        @Test
        @DisplayName("Debe listar requerimientos filtrados por área solicitante")
        void listar_porArea_debeRetornarFiltrado() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Requerimiento> page = new PageImpl<>(List.of(reqElaborado), pageable, 1);

            when(reqRepo.findByIdAreaSolicitante(4L, pageable)).thenReturn(page);
            when(mapper.toResponseConMotor(any(Requerimiento.class), anyList())).thenReturn(responseMock);

            Page<RequerimientoResponse> result = service.listar(null, 4L, pageable);

            assertEquals(1, result.getTotalElements());
            verify(reqRepo).findByIdAreaSolicitante(4L, pageable);
        }

        @Test
        @DisplayName("Debe listar todos los requerimientos sin filtro")
        void listar_sinFiltro_debeRetornarTodos() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Requerimiento> page = new PageImpl<>(List.of(reqElaborado), pageable, 1);

            when(reqRepo.findAll(pageable)).thenReturn(page);
            when(mapper.toResponseConMotor(any(Requerimiento.class), anyList())).thenReturn(responseMock);

            Page<RequerimientoResponse> result = service.listar(null, null, pageable);

            assertEquals(1, result.getTotalElements());
            verify(reqRepo).findAll(pageable);
        }
    }

    // ═══════════════════════════════════════════════════════
    // MÁQUINA DE ESTADOS BPMN — EstadoRequerimiento enum
    // ═══════════════════════════════════════════════════════

    @Nested
    @DisplayName("Máquina de estados BPMN — EstadoRequerimiento")
    class MaquinaEstados {

        @Test
        @DisplayName("ELABORADO → CON_PRESUPUESTO debe ser permitido (E7 OPP aprueba)")
        void elaborado_aConPresupuesto_debePermitir() {
            assertTrue(EstadoRequerimiento.ELABORADO
                    .puedeTransicionarA(EstadoRequerimiento.CON_PRESUPUESTO));
        }

        @Test
        @DisplayName("ELABORADO → SIN_PRESUPUESTO debe ser permitido (E7 OPP rechaza)")
        void elaborado_aSinPresupuesto_debePermitir() {
            assertTrue(EstadoRequerimiento.ELABORADO
                    .puedeTransicionarA(EstadoRequerimiento.SIN_PRESUPUESTO));
        }

        @Test
        @DisplayName("ELABORADO → CONFIGURADO NO debe ser permitido (salta E7)")
        void elaborado_aConfigurado_noDebePermitir() {
            assertFalse(EstadoRequerimiento.ELABORADO
                    .puedeTransicionarA(EstadoRequerimiento.CONFIGURADO));
        }

        @Test
        @DisplayName("CON_PRESUPUESTO → CONFIGURADO debe ser permitido (E8 ORH configura)")
        void conPresupuesto_aConfigurado_debePermitir() {
            assertTrue(EstadoRequerimiento.CON_PRESUPUESTO
                    .puedeTransicionarA(EstadoRequerimiento.CONFIGURADO));
        }

        @Test
        @DisplayName("SIN_PRESUPUESTO es terminal — no permite transiciones")
        void sinPresupuesto_esTerminal() {
            for (EstadoRequerimiento estado : EstadoRequerimiento.values()) {
                assertFalse(EstadoRequerimiento.SIN_PRESUPUESTO.puedeTransicionarA(estado),
                        "SIN_PRESUPUESTO no debe transicionar a " + estado);
            }
        }

        @Test
        @DisplayName("CONFIGURADO es terminal — no permite transiciones")
        void configurado_esTerminal() {
            for (EstadoRequerimiento estado : EstadoRequerimiento.values()) {
                assertFalse(EstadoRequerimiento.CONFIGURADO.puedeTransicionarA(estado),
                        "CONFIGURADO no debe transicionar a " + estado);
            }
        }

        @Test
        @DisplayName("CON_PRESUPUESTO no puede retroceder a ELABORADO")
        void conPresupuesto_aElaborado_noDebePermitir() {
            assertFalse(EstadoRequerimiento.CON_PRESUPUESTO
                    .puedeTransicionarA(EstadoRequerimiento.ELABORADO));
        }
    }
}
