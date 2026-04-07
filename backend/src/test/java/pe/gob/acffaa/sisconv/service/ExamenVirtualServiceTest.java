package pe.gob.acffaa.sisconv.service;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import pe.gob.acffaa.sisconv.application.dto.request.ConfigExamenRequest;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.service.ExamenVirtualService;
import pe.gob.acffaa.sisconv.application.service.NotificacionService;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.application.dto.response.ExamenPostulanteResponse;
import pe.gob.acffaa.sisconv.domain.model.BancoPregunta;
import pe.gob.acffaa.sisconv.domain.model.ConfigExamen;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;
import pe.gob.acffaa.sisconv.domain.model.Cronograma;
import pe.gob.acffaa.sisconv.domain.model.ExamenPostulante;
import pe.gob.acffaa.sisconv.domain.model.FactorEvaluacion;
import pe.gob.acffaa.sisconv.domain.model.Postulacion;
import pe.gob.acffaa.sisconv.domain.model.Postulante;
import pe.gob.acffaa.sisconv.domain.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * ExamenVirtualService — validación RN-EV-04/05/06 y configuración ORH.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ExamenVirtualService — configuración y factores E12")
class ExamenVirtualServiceTest {

    private static final long ID_CONV = 1L;

    @Mock private IBancoPreguntaRepository bancoRepo;
    @Mock private IConfigExamenRepository configRepo;
    @Mock private IExamenPostulanteRepository examenRepo;
    @Mock private IRespuestaExamenRepository respuestaRepo;
    @Mock private IConvocatoriaRepository convRepo;
    @Mock private IPostulacionRepository postRepo;
    @Mock private IFactorEvaluacionRepository factorRepo;
    @Mock private ICronogramaRepository cronoRepo;
    @Mock private IAuditPort audit;
    @Mock private NotificacionService notificacionService;
    @Mock private HttpServletRequest http;

    private ExamenVirtualService service;

    @BeforeEach
    void setUp() {
        service = new ExamenVirtualService(bancoRepo, configRepo, examenRepo, respuestaRepo,
                convRepo, postRepo, factorRepo, cronoRepo, audit, notificacionService);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("orh_test", null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private Convocatoria convocatoriaVirtual() {
        return Convocatoria.builder()
                .idConvocatoria(ID_CONV)
                .numeroConvocatoria("CAS-EV-001")
                .examenVirtualHabilitado(true)
                .build();
    }

    private FactorEvaluacion factorTecnicaRaiz(BigDecimal max, BigDecimal min) {
        return FactorEvaluacion.builder()
                .idFactor(1L)
                .convocatoria(convocatoriaVirtual())
                .etapaEvaluacion("TECNICA")
                .factorPadre(null)
                .criterio("Evaluación técnica")
                .puntajeMaximo(max)
                .puntajeMinimo(min)
                .build();
    }

    private List<BancoPregunta> bancoConPuntajes(int n, BigDecimal puntajePorPregunta) {
        Convocatoria c = convocatoriaVirtual();
        List<BancoPregunta> list = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            list.add(BancoPregunta.builder()
                    .idPregunta((long) i)
                    .convocatoria(c)
                    .numeroPregunta(i)
                    .enunciado("Q" + i)
                    .opcionA("A").opcionB("B").opcionC("C").opcionD("D")
                    .respuestaCorrecta("A")
                    .puntaje(puntajePorPregunta)
                    .build());
        }
        return list;
    }

    private Cronograma cronogramaTecnica(LocalDate ini, LocalDate fin) {
        return Cronograma.builder()
                .idCronograma(1L)
                .convocatoria(convocatoriaVirtual())
                .etapa("EVAL_TECNICA")
                .actividad("Evaluación técnica")
                .fechaInicio(ini)
                .fechaFin(fin)
                .build();
    }

    private ConfigExamenRequest requestValido() {
        return ConfigExamenRequest.builder()
                .fechaHoraInicio(LocalDateTime.of(2026, 6, 15, 9, 0))
                .fechaHoraFin(LocalDateTime.of(2026, 6, 15, 11, 0))
                .cantidadPreguntas(5)
                .duracionMinutos(60)
                .mostrarResultado(false)
                .build(); // ignorado: servicio fuerza true
    }

    @Test
    @DisplayName("configurarExamen: éxito cuando factores, banco y cronograma son coherentes")
    void configurarExamen_exito() {
        when(convRepo.findById(ID_CONV)).thenReturn(Optional.of(convocatoriaVirtual()));
        when(bancoRepo.countByConvocatoriaId(ID_CONV)).thenReturn(10L);
        when(factorRepo.findByConvocatoriaId(ID_CONV)).thenReturn(
                List.of(factorTecnicaRaiz(new BigDecimal("30"), new BigDecimal("20"))));
        when(bancoRepo.findByConvocatoriaId(ID_CONV)).thenReturn(bancoConPuntajes(10, new BigDecimal("2")));
        when(cronoRepo.findByConvocatoriaId(ID_CONV)).thenReturn(
                List.of(cronogramaTecnica(LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30))));
        when(configRepo.findByConvocatoriaId(ID_CONV)).thenReturn(Optional.empty());
        when(configRepo.save(any(ConfigExamen.class))).thenAnswer(inv -> {
            ConfigExamen cfg = inv.getArgument(0);
            if (cfg.getIdConfigExamen() == null) {
                cfg.setIdConfigExamen(100L);
            }
            return cfg;
        });

        var res = service.configurarExamen(ID_CONV, requestValido(), http);

        assertNotNull(res);
        assertTrue(Boolean.TRUE.equals(res.getMostrarResultado()));
        assertEquals(120, res.getDuracionMinutos());
        assertEquals(0, res.getPuntajeMinimoTecnica().compareTo(new BigDecimal("20")));
        assertEquals(0, res.getPuntajeMaximoTecnica().compareTo(new BigDecimal("30")));
        verify(configRepo).save(any(ConfigExamen.class));
        verify(audit).registrar(eq("CONFIG_EXAMEN"), eq(ID_CONV), eq("CONFIGURAR_EXAMEN"), any(), any(), eq(http), isNull());
    }

    @Test
    @DisplayName("configurarExamen: rechaza cuando umbral TECNICA supera máximo de fase (RN-EV-04)")
    void configurarExamen_umbralSuperaMaximoFase() {
        when(convRepo.findById(ID_CONV)).thenReturn(Optional.of(convocatoriaVirtual()));
        when(bancoRepo.countByConvocatoriaId(ID_CONV)).thenReturn(10L);
        when(factorRepo.findByConvocatoriaId(ID_CONV)).thenReturn(
                List.of(factorTecnicaRaiz(new BigDecimal("30"), new BigDecimal("35"))));

        DomainException ex = assertThrows(DomainException.class,
                () -> service.configurarExamen(ID_CONV, requestValido(), http));
        assertTrue(ex.getMessage().contains("no puede superar el puntaje máximo"));
        verify(configRepo, never()).save(any());
    }

    @Test
    @DisplayName("configurarExamen: rechaza fecha fuera del cronograma EVAL_TECNICA (RN-EV-06)")
    void configurarExamen_fechaFueraCronograma() {
        when(convRepo.findById(ID_CONV)).thenReturn(Optional.of(convocatoriaVirtual()));
        when(bancoRepo.countByConvocatoriaId(ID_CONV)).thenReturn(10L);
        when(factorRepo.findByConvocatoriaId(ID_CONV)).thenReturn(
                List.of(factorTecnicaRaiz(new BigDecimal("30"), new BigDecimal("20"))));
        when(bancoRepo.findByConvocatoriaId(ID_CONV)).thenReturn(bancoConPuntajes(10, new BigDecimal("2")));
        when(cronoRepo.findByConvocatoriaId(ID_CONV)).thenReturn(
                List.of(cronogramaTecnica(LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31))));

        ConfigExamenRequest req = ConfigExamenRequest.builder()
                .fechaHoraInicio(LocalDateTime.of(2026, 6, 15, 9, 0))
                .fechaHoraFin(LocalDateTime.of(2026, 6, 15, 11, 0))
                .cantidadPreguntas(5)
                .duracionMinutos(60)
                .build();

        DomainException ex = assertThrows(DomainException.class,
                () -> service.configurarExamen(ID_CONV, req, http));
        assertTrue(ex.getMessage().contains("cronograma"));
        verify(configRepo, never()).save(any());
    }

    @Test
    @DisplayName("configurarExamen: rechaza pregunta del banco con puntaje < 1")
    void configurarExamen_bancoPuntajeInvalido() {
        when(convRepo.findById(ID_CONV)).thenReturn(Optional.of(convocatoriaVirtual()));
        when(bancoRepo.countByConvocatoriaId(ID_CONV)).thenReturn(5L);
        when(factorRepo.findByConvocatoriaId(ID_CONV)).thenReturn(
                List.of(factorTecnicaRaiz(new BigDecimal("30"), new BigDecimal("20"))));
        List<BancoPregunta> mal = bancoConPuntajes(5, new BigDecimal("2"));
        mal.get(0).setPuntaje(new BigDecimal("0.5"));
        when(bancoRepo.findByConvocatoriaId(ID_CONV)).thenReturn(mal);

        DomainException ex = assertThrows(DomainException.class,
                () -> service.configurarExamen(ID_CONV, requestValido(), http));
        assertTrue(ex.getMessage().contains("puntaje mayor o igual a 1"));
        verify(configRepo, never()).save(any());
    }

    @Test
    @DisplayName("configurarExamen: rechaza fin anterior o igual al inicio")
    void configurarExamen_finNoPosterior() {
        when(convRepo.findById(ID_CONV)).thenReturn(Optional.of(convocatoriaVirtual()));
        when(bancoRepo.countByConvocatoriaId(ID_CONV)).thenReturn(10L);

        ConfigExamenRequest req = ConfigExamenRequest.builder()
                .fechaHoraInicio(LocalDateTime.of(2026, 6, 15, 11, 0))
                .fechaHoraFin(LocalDateTime.of(2026, 6, 15, 9, 0))
                .cantidadPreguntas(5)
                .duracionMinutos(60)
                .build();

        DomainException ex = assertThrows(DomainException.class,
                () -> service.configurarExamen(ID_CONV, req, http));
        assertTrue(ex.getMessage().contains("posterior"));
        verify(configRepo, never()).save(any());
    }

    @Test
    @DisplayName("configurarExamen: rechaza si examen virtual no está habilitado")
    void configurarExamen_examenVirtualNoHabilitado() {
        Convocatoria c = Convocatoria.builder()
                .idConvocatoria(ID_CONV)
                .examenVirtualHabilitado(false)
                .build();
        when(convRepo.findById(ID_CONV)).thenReturn(Optional.of(c));

        DomainException ex = assertThrows(DomainException.class,
                () -> service.configurarExamen(ID_CONV, requestValido(), http));
        assertTrue(ex.getMessage().contains("no está habilitado"));
        verify(configRepo, never()).save(any());
    }

    @Test
    @DisplayName("resultadosConsolidados: incluye APTO sin fila de examen como SIN_INICIAR")
    void resultadosConsolidados_sinIniciar() {
        Convocatoria conv = convocatoriaVirtual();
        ConfigExamen cfg = ConfigExamen.builder()
                .idConfigExamen(50L)
                .convocatoria(conv)
                .estado("PUBLICADO")
                .build();
        Postulante po = Postulante.builder()
                .idPostulante(9L)
                .nombres("ANA")
                .apellidoPaterno("TEST")
                .build();
        Postulacion post = Postulacion.builder()
                .idPostulacion(100L)
                .convocatoria(conv)
                .postulante(po)
                .estado("APTO")
                .codigoAnonimo("COD-1")
                .build();

        when(configRepo.findByConvocatoriaId(ID_CONV)).thenReturn(Optional.of(cfg));
        when(factorRepo.findByConvocatoriaId(ID_CONV)).thenReturn(
                List.of(factorTecnicaUmbral20()));
        when(postRepo.findAptosByConvocatoriaWithPostulante(ID_CONV)).thenReturn(List.of(post));
        when(examenRepo.findByConfigExamenIdWithPostulacion(50L)).thenReturn(Collections.emptyList());

        List<ExamenPostulanteResponse.ResultadoConsolidado> rows = service.resultadosConsolidados(ID_CONV);

        assertEquals(1, rows.size());
        assertEquals("SIN_INICIAR", rows.get(0).getEstadoExamen());
        assertEquals("PENDIENTE", rows.get(0).getResultadoTecnica());
    }

    private FactorEvaluacion factorTecnicaUmbral20() {
        return factorTecnicaRaiz(new BigDecimal("30"), new BigDecimal("20"));
    }

    @Test
    @DisplayName("resultadosConsolidados: examen finalizado con puntaje técnica y APTO")
    void resultadosConsolidados_finalizadoApto() {
        Convocatoria conv = convocatoriaVirtual();
        ConfigExamen cfg = ConfigExamen.builder()
                .idConfigExamen(50L)
                .convocatoria(conv)
                .estado("PUBLICADO")
                .build();
        Postulante po = postulanteAna();
        Postulacion post = Postulacion.builder()
                .idPostulacion(100L)
                .convocatoria(conv)
                .postulante(po)
                .estado("APTO")
                .puntajeTecnica(new BigDecimal("25.00"))
                .codigoAnonimo("COD-1")
                .build();
        ExamenPostulante ep = ExamenPostulante.builder()
                .idExamenPostulante(1L)
                .configExamen(cfg)
                .postulacion(post)
                .estado("FINALIZADO")
                .puntajeTotal(new BigDecimal("8"))
                .totalCorrectas(4)
                .totalPreguntas(5)
                .build();

        when(configRepo.findByConvocatoriaId(ID_CONV)).thenReturn(Optional.of(cfg));
        when(factorRepo.findByConvocatoriaId(ID_CONV)).thenReturn(
                List.of(factorTecnicaUmbral20()));
        when(postRepo.findAptosByConvocatoriaWithPostulante(ID_CONV)).thenReturn(List.of(post));
        when(examenRepo.findByConfigExamenIdWithPostulacion(50L)).thenReturn(List.of(ep));

        List<ExamenPostulanteResponse.ResultadoConsolidado> rows = service.resultadosConsolidados(ID_CONV);

        assertEquals(1, rows.size());
        assertEquals("FINALIZADO", rows.get(0).getEstadoExamen());
        assertEquals(0, rows.get(0).getPuntajeTecnicaEscala().compareTo(new BigDecimal("25.00")));
        assertEquals("APTO", rows.get(0).getResultadoTecnica());
    }

    private static Postulante postulanteAna() {
        return Postulante.builder()
                .idPostulante(9L)
                .nombres("ANA")
                .apellidoPaterno("TEST")
                .build();
    }
}
