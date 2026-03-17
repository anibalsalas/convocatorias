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
import pe.gob.acffaa.sisconv.application.mapper.SeleccionMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.service.SeleccionService;
import pe.gob.acffaa.sisconv.domain.exception.*;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.domain.repository.*;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * SeleccionServiceTest — PKG-03 E24-E31.
 * Corregido para coherencia 100% con DDL_NEW.sql:
 *   - Estados: REGISTRADO→VERIFICADO→APTO/NO_APTO→GANADOR/ACCESITARIO/NO_SELECCIONADO
 *   - CK_BONIF_TIPO: FFAA (no LICENCIADO_FFAA)
 *   - CuadroMeritos.resultado (no resultadoFinal)
 *   - EntrevistaMiembro.idMiembroComite, puntajeIndividual
 *   - EvaluacionCurricular/Tecnica.evaluador (FK @ManyToOne, no String)
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PKG-03: SeleccionService Tests (E24-E31)")
class SeleccionServiceTest {

    @Mock private IPostulacionRepository postRepo;
    @Mock private IConvocatoriaRepository convRepo;
    @Mock private IEvaluacionCurricularRepository evalCurrRepo;
    @Mock private IEvaluacionTecnicaRepository evalTecRepo;
    @Mock private IEntrevistaPersonalRepository entrevistaRepo;
    @Mock private IEntrevistaMiembroRepository entMiembroRepo;
    @Mock private IBonificacionRepository bonifRepo;
    @Mock private ICuadroMeritosRepository meritoRepo;
    @Mock private IFactorEvaluacionRepository factorRepo;
    @Mock private IUsuarioRepository usuarioRepo;
    @Mock private IAuditPort audit;
    @Mock private HttpServletRequest http;

    @InjectMocks private SeleccionService service;
    private SeleccionMapper mapper = new SeleccionMapper();

    @BeforeEach
    void setUp() {
        service = new SeleccionService(postRepo, convRepo, evalCurrRepo, evalTecRepo,
                entrevistaRepo, entMiembroRepo, bonifRepo, meritoRepo, factorRepo,
                usuarioRepo, audit, mapper);
        // FIX: Configurar SecurityContext para que user() no lance NPE
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin_test", null, List.of()));
        lenient().when(usuarioRepo.findByUsername(anyString())).thenReturn(Optional.empty());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ── Helpers ──

    private Convocatoria convEnSeleccion() {
        Requerimiento req = Requerimiento.builder().idRequerimiento(1L).cantidadPuestos(1).build();
        return Convocatoria.builder().idConvocatoria(1L).numeroConvocatoria("CAS-001-2026")
                .estado("EN_SELECCION").requerimiento(req)
                .pesoEvalCurricular(new BigDecimal("30.00"))
                .pesoEvalTecnica(new BigDecimal("35.00"))
                .pesoEntrevista(new BigDecimal("35.00")).build();
    }

    private Postulante postulanteMock(boolean ffaa, boolean discap, boolean deport) {
        return Postulante.builder().idPostulante(10L)
                .tipoDocumento("DNI").numeroDocumento("12345678")
                .nombres("Juan").apellidoPaterno("Perez").apellidoMaterno("Lopez")
                .esLicenciadoFfaa(ffaa).esPersonaDiscap(discap).esDeportistaDest(deport).build();
    }

    private Postulacion postulacionConEstado(String estado) {
        return Postulacion.builder().idPostulacion(100L)
                .convocatoria(convEnSeleccion()).postulante(postulanteMock(false, false, false))
                .estado(estado).build();
    }

    private FactorEvaluacion factor(Long id, String etapa) {
        return FactorEvaluacion.builder().idFactor(id).etapaEvaluacion(etapa)
                .criterio("Criterio " + id).puntajeMaximo(new BigDecimal("100.00"))
                .pesoCriterio(new BigDecimal("50.00")).build();
    }

    // ── E24 Tests — VERIFICADO → APTO/NO_APTO ──

    @Test @DisplayName("E24: Eval curricular exitosa - APTO (>=60)")
    void e24_evalCurricularApto() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        when(factorRepo.findByConvocatoriaId(1L)).thenReturn(List.of(factor(1L, "CURRICULAR")));
        when(usuarioRepo.findByUsername(any())).thenReturn(Optional.empty());
        Postulacion p = postulacionConEstado("VERIFICADO");
        when(postRepo.findById(100L)).thenReturn(Optional.of(p));
        when(postRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(evalCurrRepo.save(any())).thenReturn(EvaluacionCurricular.builder().build());

        EvalCurricularRequest req = EvalCurricularRequest.builder()
                .evaluaciones(List.of(EvalCurricularRequest.EvalItem.builder()
                        .idPostulacion(100L)
                        .factores(List.of(EvalCurricularRequest.FactorPuntaje.builder()
                                .idFactor(1L).puntaje(new BigDecimal("75.00")).build()))
                        .build())).build();

        EvalCurricularResponse r = service.evalCurricular(1L, req, http);
        assertEquals(1, r.getTotalAptos());
        assertEquals(0, r.getTotalNoAptos());
        assertEquals("APTO", r.getResultados().get(0).getEstado());
    }

    @Test @DisplayName("E24: Eval curricular NO_APTO (<60)")
    void e24_evalCurricularNoApto() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        when(factorRepo.findByConvocatoriaId(1L)).thenReturn(List.of(factor(1L, "CURRICULAR")));
        when(usuarioRepo.findByUsername(any())).thenReturn(Optional.empty());
        Postulacion p = postulacionConEstado("VERIFICADO");
        when(postRepo.findById(100L)).thenReturn(Optional.of(p));
        when(postRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(evalCurrRepo.save(any())).thenReturn(EvaluacionCurricular.builder().build());

        EvalCurricularRequest req = EvalCurricularRequest.builder()
                .evaluaciones(List.of(EvalCurricularRequest.EvalItem.builder()
                        .idPostulacion(100L)
                        .factores(List.of(EvalCurricularRequest.FactorPuntaje.builder()
                                .idFactor(1L).puntaje(new BigDecimal("45.00")).build()))
                        .build())).build();

        EvalCurricularResponse r = service.evalCurricular(1L, req, http);
        assertEquals(0, r.getTotalAptos());
        assertEquals(1, r.getTotalNoAptos());
        assertEquals("NO_APTO", r.getResultados().get(0).getEstado());
    }

    @Test @DisplayName("E24: Postulacion no VERIFICADO -> 400")
    void e24_estadoInvalido() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        when(factorRepo.findByConvocatoriaId(1L)).thenReturn(List.of(factor(1L, "CURRICULAR")));
        when(postRepo.findById(100L)).thenReturn(Optional.of(postulacionConEstado("REGISTRADO")));
        EvalCurricularRequest req = EvalCurricularRequest.builder()
                .evaluaciones(List.of(EvalCurricularRequest.EvalItem.builder()
                        .idPostulacion(100L).factores(List.of()).build())).build();
        assertThrows(DomainException.class, () -> service.evalCurricular(1L, req, http));
    }

    @Test @DisplayName("E24: Sin factores configurados -> 400")
    void e24_sinFactores() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        when(factorRepo.findByConvocatoriaId(1L)).thenReturn(List.of());
        EvalCurricularRequest req = EvalCurricularRequest.builder().evaluaciones(List.of()).build();
        assertThrows(DomainException.class, () -> service.evalCurricular(1L, req, http));
    }

    // ── E25 Tests ──

    @Test @DisplayName("E25: Asignar codigos anonimos exitoso (RF-10)")
    void e25_codigosExitoso() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        Postulacion p = postulacionConEstado("APTO");
        when(postRepo.findByConvocatoriaIdAndEstado(1L, "APTO")).thenReturn(List.of(p));
        when(postRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<PostulacionResponse> r = service.asignarCodigosAnonimos(1L, http);
        assertEquals(1, r.size());
        assertNotNull(r.get(0).getCodigoAnonimo());
        assertTrue(r.get(0).getCodigoAnonimo().startsWith("COD-"));
    }

    @Test @DisplayName("E25: Sin postulaciones APTO -> 400")
    void e25_sinAptos() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        when(postRepo.findByConvocatoriaIdAndEstado(1L, "APTO")).thenReturn(List.of());
        assertThrows(DomainException.class, () -> service.asignarCodigosAnonimos(1L, http));
    }

    // ── E26 Tests — Estado permanece APTO o → NO_APTO ──

    @Test @DisplayName("E26: Eval tecnica exitosa (RF-11)")
    void e26_evalTecnicaExitosa() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        when(factorRepo.findByConvocatoriaId(1L)).thenReturn(List.of(factor(2L, "TECNICA")));
        when(usuarioRepo.findByUsername(any())).thenReturn(Optional.empty());
        Postulacion p = postulacionConEstado("APTO");
        p.setCodigoAnonimo("COD-0001");
        when(postRepo.findByConvocatoriaIdAndEstado(1L, "APTO")).thenReturn(List.of(p));
        when(postRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(evalTecRepo.save(any())).thenReturn(EvaluacionTecnica.builder().build());

        EvalTecnicaRequest req = EvalTecnicaRequest.builder()
                .evaluaciones(List.of(EvalTecnicaRequest.EvalTecItem.builder()
                        .codigoAnonimo("COD-0001").puntaje(new BigDecimal("80.00")).build()))
                .build();
        EvalTecnicaResponse r = service.evalTecnica(1L, req, http);
        assertEquals(1, r.getTotalEvaluados());
        // Permanece APTO si aprueba (>=60)
        assertEquals("APTO", r.getResultados().get(0).getEstado());
    }

    @Test @DisplayName("E26: Codigo anonimo no encontrado -> 400")
    void e26_codigoNoEncontrado() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        when(factorRepo.findByConvocatoriaId(1L)).thenReturn(List.of(factor(2L, "TECNICA")));
        when(postRepo.findByConvocatoriaIdAndEstado(1L, "APTO")).thenReturn(List.of());
        EvalTecnicaRequest req = EvalTecnicaRequest.builder()
                .evaluaciones(List.of(EvalTecnicaRequest.EvalTecItem.builder()
                        .codigoAnonimo("NOEXISTE").puntaje(new BigDecimal("80")).build()))
                .build();
        assertThrows(DomainException.class, () -> service.evalTecnica(1L, req, http));
    }

    // ── E27 Tests — Estado permanece APTO ──

    @Test @DisplayName("E27: Entrevista exitosa con quorum (RF-13)")
    void e27_entrevistaExitosa() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        Postulacion p = postulacionConEstado("APTO");
        when(postRepo.findById(100L)).thenReturn(Optional.of(p));
        when(postRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(entrevistaRepo.save(any())).thenAnswer(inv -> {
            EntrevistaPersonal e = inv.getArgument(0);
            e.setIdEntrevista(1L);
            return e;
        });
        when(entMiembroRepo.save(any())).thenReturn(EntrevistaMiembro.builder().build());

        EntrevistaRequest req = EntrevistaRequest.builder()
                .entrevistas(List.of(EntrevistaRequest.EntrevistaItem.builder()
                        .idPostulacion(100L)
                        .puntajesMiembros(List.of(
                                EntrevistaRequest.MiembroPuntaje.builder().idMiembroComite(1L).puntaje(new BigDecimal("85")).build(),
                                EntrevistaRequest.MiembroPuntaje.builder().idMiembroComite(2L).puntaje(new BigDecimal("90")).build(),
                                EntrevistaRequest.MiembroPuntaje.builder().idMiembroComite(3L).puntaje(new BigDecimal("80")).build()
                        )).build())).build();

        EntrevistaResponse r = service.entrevistas(1L, req, http);
        assertEquals(1, r.getTotalEntrevistados());
        assertTrue(r.getResultados().get(0).getQuorumAlcanzado());
        assertEquals(new BigDecimal("85.00"), r.getResultados().get(0).getPuntajePromedio());
    }

    @Test @DisplayName("E27: Postulacion no APTO -> 400")
    void e27_estadoInvalido() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        when(postRepo.findById(100L)).thenReturn(Optional.of(postulacionConEstado("VERIFICADO")));
        EntrevistaRequest req = EntrevistaRequest.builder()
                .entrevistas(List.of(EntrevistaRequest.EntrevistaItem.builder()
                        .idPostulacion(100L).puntajesMiembros(List.of()).build())).build();
        assertThrows(DomainException.class, () -> service.entrevistas(1L, req, http));
    }

    // ── E28 Tests — Bonificaciones CK_BONIF_TIPO: FFAA, DISCAPACIDAD, DEPORTISTA ──

    @Test @DisplayName("E28: Bonificaciones RF-15 (FFAA 10%)")
    void e28_bonificacionFfaa() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        Postulacion p = postulacionConEstado("APTO");
        p.setPostulante(postulanteMock(true, false, false));
        p.setPuntajeCurricular(new BigDecimal("80"));
        p.setPuntajeTecnica(new BigDecimal("70"));
        p.setPuntajeEntrevista(new BigDecimal("85"));
        when(postRepo.findByConvocatoriaIdAndEstado(1L, "APTO")).thenReturn(List.of(p));
        when(postRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bonifRepo.save(any())).thenReturn(Bonificacion.builder().build());

        BonificacionResponse r = service.bonificaciones(1L, http);
        assertEquals(1, r.getTotalBonificados());
        assertEquals("FFAA", r.getBonificaciones().get(0).getTipoBonificacion());
        assertEquals(new BigDecimal("10.00"), r.getBonificaciones().get(0).getPorcentaje());
    }

    @Test @DisplayName("E28: Sin postulaciones APTO -> 400")
    void e28_sinAptos() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        when(postRepo.findByConvocatoriaIdAndEstado(1L, "APTO")).thenReturn(List.of());
        assertThrows(DomainException.class, () -> service.bonificaciones(1L, http));
    }

    // ── E29 Tests — APTO → GANADOR/ACCESITARIO/NO_SELECCIONADO ──

    @Test @DisplayName("E29: Cuadro meritos RF-16 ponderado")
    void e29_cuadroMeritosExitoso() {
        Convocatoria conv = convEnSeleccion();
        when(convRepo.findById(1L)).thenReturn(Optional.of(conv));
        Postulacion p = postulacionConEstado("APTO");
        p.setPuntajeCurricular(new BigDecimal("80"));
        p.setPuntajeTecnica(new BigDecimal("70"));
        p.setPuntajeEntrevista(new BigDecimal("85"));
        p.setPuntajeBonificacion(BigDecimal.ZERO);
        when(postRepo.findByConvocatoriaIdAndEstado(1L, "APTO")).thenReturn(List.of(p));
        when(postRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(meritoRepo.save(any())).thenReturn(CuadroMeritos.builder().build());

        CuadroMeritosResponse r = service.cuadroMeritos(1L, http);
        assertEquals(1, r.getTotalPostulantes());
        assertEquals("GANADOR", r.getCuadro().get(0).getResultado());
        assertNotNull(r.getCuadro().get(0).getPuntajeTotal());
    }

    // ── E30 Tests ──

    @Test @DisplayName("E30: Generar PDF (placeholder texto)")
    void e30_generarPdf() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        CuadroMeritos cm = CuadroMeritos.builder().ordenMerito(1).puntajeTotal(new BigDecimal("85"))
                .resultado("GANADOR")
                .postulacion(postulacionConEstado("GANADOR")).build();
        when(meritoRepo.findByConvocatoriaId(1L)).thenReturn(List.of(cm));

        byte[] pdf = service.generarResultadosPdf(1L);
        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
        String texto = new String(pdf);
        assertTrue(texto.contains("RESULTADOS FINALES"));
    }

    @Test @DisplayName("E30: Sin cuadro meritos -> 400")
    void e30_sinMeritos() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        when(meritoRepo.findByConvocatoriaId(1L)).thenReturn(List.of());
        assertThrows(DomainException.class, () -> service.generarResultadosPdf(1L));
    }

    // ── E31 Tests ──

    @Test @DisplayName("E31: Publicar resultados -> FINALIZADA")
    void e31_publicarExitoso() {
        Convocatoria conv = convEnSeleccion();
        when(convRepo.findById(1L)).thenReturn(Optional.of(conv));
        when(convRepo.save(any())).thenReturn(conv);
        CuadroMeritos cm = CuadroMeritos.builder().ordenMerito(1).puntajeTotal(new BigDecimal("85"))
                .puntajeCurricular(new BigDecimal("80")).puntajeTecnica(new BigDecimal("70"))
                .puntajeEntrevista(new BigDecimal("85")).puntajeBonificacion(BigDecimal.ZERO)
                .resultado("GANADOR")
                .postulacion(postulacionConEstado("GANADOR")).build();
        when(meritoRepo.findByConvocatoriaId(1L)).thenReturn(List.of(cm));

        CuadroMeritosResponse r = service.publicarResultados(1L, http);
        assertTrue(r.getMensaje().contains("FINALIZADA"));
        assertEquals(1, r.getTotalPostulantes());
    }

    @Test @DisplayName("E31: Conv no EN_SELECCION -> 400")
    void e31_estadoInvalido() {
        Convocatoria conv = convEnSeleccion();
        conv.setEstado("EN_ELABORACION");
        when(convRepo.findById(1L)).thenReturn(Optional.of(conv));
        assertThrows(DomainException.class, () -> service.publicarResultados(1L, http));
    }

    @Test @DisplayName("E31: Sin cuadro meritos -> 400")
    void e31_sinMeritos() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        when(meritoRepo.findByConvocatoriaId(1L)).thenReturn(List.of());
        assertThrows(DomainException.class, () -> service.publicarResultados(1L, http));
    }

    // ── Statechart Validation Tests (FIX #3) ──

    @Test @DisplayName("Statechart: evalCurricular REGISTRADO → DomainException (requiere VERIFICADO)")
    void statechart_evalCurricular_registrado_rechazado() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        FactorEvaluacion factor = FactorEvaluacion.builder().idFactor(1L).etapaEvaluacion("CURRICULAR").build();
        when(factorRepo.findByConvocatoriaId(1L)).thenReturn(List.of(factor));
        // Postulacion en REGISTRADO, no en VERIFICADO
        when(postRepo.findById(100L)).thenReturn(Optional.of(postulacionConEstado("REGISTRADO")));

        EvalCurricularRequest req = EvalCurricularRequest.builder()
                .evaluaciones(List.of(EvalCurricularRequest.EvalItem.builder()
                        .idPostulacion(100L)
                        .factores(List.of(EvalCurricularRequest.FactorPuntaje.builder()
                                .idFactor(1L).puntaje(new BigDecimal("80")).build()))
                        .build()))
                .build();
        assertThrows(DomainException.class, () -> service.evalCurricular(1L, req, http));
    }

    @Test @DisplayName("Statechart: APTO → NO_APTO permitido (eval técnica reprobada)")
    void statechart_apto_a_noApto_permitido() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convEnSeleccion()));
        Postulacion p = postulacionConEstado("APTO");
        p.setCodigoAnonimo("COD-0001");
        when(postRepo.findByConvocatoriaIdAndEstado(1L, "APTO")).thenReturn(List.of(p));
        when(factorRepo.findByConvocatoriaId(1L)).thenReturn(List.of(
                FactorEvaluacion.builder().idFactor(1L).etapaEvaluacion("TECNICA").build()));
        when(evalTecRepo.save(any())).thenReturn(EvaluacionTecnica.builder().build());
        when(postRepo.save(any())).thenReturn(p);

        EvalTecnicaRequest req = EvalTecnicaRequest.builder()
                .evaluaciones(List.of(EvalTecnicaRequest.EvalTecItem.builder()
                        .codigoAnonimo("COD-0001").puntaje(new BigDecimal("40.00")).build()))
                .build();
        // No debe lanzar excepción — puntaje < 60 marca NO_APTO desde APTO
        EvalTecnicaResponse r = service.evalTecnica(1L, req, http);
        assertNotNull(r);
        assertEquals(1, r.getTotalEvaluados());
    }
}