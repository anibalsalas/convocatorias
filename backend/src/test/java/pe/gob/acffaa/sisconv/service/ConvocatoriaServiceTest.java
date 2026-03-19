package pe.gob.acffaa.sisconv.service;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.gob.acffaa.sisconv.application.dto.request.CronogramaRequest;
import pe.gob.acffaa.sisconv.application.dto.response.CronogramaResponse;
import pe.gob.acffaa.sisconv.application.mapper.ConvocatoriaMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.service.ConvocatoriaService;
import pe.gob.acffaa.sisconv.application.service.NotificacionService;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;
import pe.gob.acffaa.sisconv.domain.model.Cronograma;
import pe.gob.acffaa.sisconv.domain.repository.IActaRepository;
import pe.gob.acffaa.sisconv.domain.repository.IComiteSeleccionRepository;
import pe.gob.acffaa.sisconv.domain.repository.IConvocatoriaRepository;
import pe.gob.acffaa.sisconv.domain.repository.ICronogramaRepository;
import pe.gob.acffaa.sisconv.domain.repository.IFactorEvaluacionRepository;
import pe.gob.acffaa.sisconv.domain.repository.IReglaMotorRepository;
import pe.gob.acffaa.sisconv.domain.repository.IRequerimientoRepository;
import pe.gob.acffaa.sisconv.infrastructure.persistence.JpaMiembroComiteRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PKG-02: ConvocatoriaService Tests — registrarCronograma")
class ConvocatoriaServiceTest {

    @Mock private IConvocatoriaRepository convRepo;
    @Mock private IRequerimientoRepository reqRepo;
    @Mock private ICronogramaRepository cronoRepo;
    @Mock private IComiteSeleccionRepository comiteRepo;
    @Mock private IFactorEvaluacionRepository factorRepo;
    @Mock private IActaRepository actaRepo;
    @Mock private IReglaMotorRepository reglaRepo;
    @Mock private IAuditPort auditPort;
    @Mock private NotificacionService notificacionService;
    @Mock private JpaMiembroComiteRepository miembroJpaRepo;
    @Mock private HttpServletRequest httpReq;

    private ConvocatoriaService service;
    private final ConvocatoriaMapper mapper = new ConvocatoriaMapper();

    @BeforeEach
    void setUp() {
        service = new ConvocatoriaService(
                convRepo,
                reqRepo,
                cronoRepo,
                comiteRepo,
                factorRepo,
                actaRepo,
                reglaRepo,
                mapper,
                auditPort,
                notificacionService,
                miembroJpaRepo
        );

        lenient().when(httpReq.getRemoteAddr()).thenReturn("127.0.0.1");
    }

    @Test
    @DisplayName("E10: Registrar cronograma exitoso")
    void registrarCronograma_exitoso() {
        Long idConvocatoria = 1L;
        Convocatoria convocatoria = convocatoriaEnElaboracion(idConvocatoria);

        CronogramaRequest request = CronogramaRequest.builder()
                .actividades(List.of(
                        actividad(
                                "POSTULACION",
                                "Recepción de postulaciones",
                                LocalDate.of(2026, 3, 16),
                                LocalDate.of(2026, 3, 27),
                                "ORH",
                                "VIRTUAL",
                                1
                        ),
                        actividad(
                                "EVALUACION_CURRICULAR",
                                "Evaluación curricular",
                                LocalDate.of(2026, 3, 30),
                                LocalDate.of(2026, 3, 31),
                                "COMITE",
                                "SEDE CENTRAL",
                                2
                        )
                ))
                .build();

        when(convRepo.findById(idConvocatoria)).thenReturn(Optional.of(convocatoria));
        when(cronoRepo.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        CronogramaResponse response = service.registrarCronograma(
                idConvocatoria,
                request,
                "orh_user",
                httpReq
        );

        assertNotNull(response);
        assertEquals(idConvocatoria, response.getIdConvocatoria());
        assertEquals(2, response.getActividadesRegistradas());
        assertEquals("Cronograma registrado exitosamente", response.getMensaje());

        verify(cronoRepo).deleteByConvocatoriaId(idConvocatoria);
        verify(cronoRepo).saveAll(argThat(lista -> lista != null && lista.size() == 2));
        verify(auditPort).registrarConvocatoria(
                eq(idConvocatoria),
                eq("TBL_CRONOGRAMA"),
                eq(idConvocatoria),
                eq("REGISTRAR_CRONOGRAMA"),
                isNull(),
                isNull(),
                any(String.class),
                eq(httpReq)
        );
        verify(notificacionService).notificarRol(
                eq("ORH"),
                eq(convocatoria),
                eq("Cronograma registrado"),
                contains("fue registrado"),
                eq("orh_user")
        );
    }

    @Test
    @DisplayName("E10: Convocatoria no encontrada -> 404")
    void registrarCronograma_convocatoriaNoEncontrada() {
        when(convRepo.findById(99L)).thenReturn(Optional.empty());

        CronogramaRequest request = CronogramaRequest.builder()
                .actividades(List.of())
                .build();

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.registrarCronograma(99L, request, "orh_user", httpReq)
        );
    }

    @Test
    @DisplayName("E10: Convocatoria fuera de EN_ELABORACION -> 400")
    void registrarCronograma_estadoInvalido() {
        Convocatoria convocatoria = convocatoriaEnElaboracion(1L);
        convocatoria.setEstado(EstadoConvocatoria.PUBLICADA);

        when(convRepo.findById(1L)).thenReturn(Optional.of(convocatoria));

        CronogramaRequest request = CronogramaRequest.builder()
                .actividades(List.of(
                        actividad(
                                "POSTULACION",
                                "Recepción de postulaciones",
                                LocalDate.of(2026, 3, 16),
                                LocalDate.of(2026, 3, 27),
                                "ORH",
                                "VIRTUAL",
                                1
                        )
                ))
                .build();

        DomainException ex = assertThrows(
                DomainException.class,
                () -> service.registrarCronograma(1L, request, "orh_user", httpReq)
        );

        assertTrue(ex.getMessage().contains("Estado actual"));
    }

    @Test
    @DisplayName("E10: Debe incluir etapa POSTULACION -> 400")
    void registrarCronograma_sinPostulacion() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convocatoriaEnElaboracion(1L)));

        CronogramaRequest request = CronogramaRequest.builder()
                .actividades(List.of(
                        actividad(
                                "EVALUACION_CURRICULAR",
                                "Evaluación curricular",
                                LocalDate.of(2026, 3, 30),
                                LocalDate.of(2026, 3, 31),
                                "COMITE",
                                "SEDE CENTRAL",
                                1
                        )
                ))
                .build();

        DomainException ex = assertThrows(
                DomainException.class,
                () -> service.registrarCronograma(1L, request, "orh_user", httpReq)
        );

        assertTrue(ex.getMessage().contains("Postulación"));
    }

    @Test
    @DisplayName("E10: Postulación menor a 10 días hábiles -> 400")
    void registrarCronograma_postulacionMenorDiezDiasHabiles() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convocatoriaEnElaboracion(1L)));

        CronogramaRequest request = CronogramaRequest.builder()
                .actividades(List.of(
                        actividad(
                                "POSTULACION",
                                "Recepción de postulaciones",
                                LocalDate.of(2026, 3, 16),
                                LocalDate.of(2026, 3, 20),
                                "ORH",
                                "VIRTUAL",
                                1
                        )
                ))
                .build();

        DomainException ex = assertThrows(
                DomainException.class,
                () -> service.registrarCronograma(1L, request, "orh_user", httpReq)
        );

        assertTrue(ex.getMessage().contains("10 días hábiles"));
    }

    @Test
    @DisplayName("E10: Fecha fin anterior a fecha inicio -> 400")
    void registrarCronograma_fechasInvalidas() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convocatoriaEnElaboracion(1L)));

        CronogramaRequest request = CronogramaRequest.builder()
                .actividades(List.of(
                        actividad(
                                "POSTULACION",
                                "Recepción de postulaciones",
                                LocalDate.of(2026, 3, 27),
                                LocalDate.of(2026, 3, 16),
                                "ORH",
                                "VIRTUAL",
                                1
                        )
                ))
                .build();

        DomainException ex = assertThrows(
                DomainException.class,
                () -> service.registrarCronograma(1L, request, "orh_user", httpReq)
        );

        assertTrue(ex.getMessage().contains("Fecha fin"));
    }

    @Test
    @DisplayName("E10: Etapa fuera de orden cronológico -> 400")
    void registrarCronograma_etapasFueraDeOrden() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convocatoriaEnElaboracion(1L)));

        CronogramaRequest request = CronogramaRequest.builder()
                .actividades(List.of(
                        actividad(
                                "POSTULACION",
                                "Recepción de postulaciones",
                                LocalDate.of(2026, 3, 16),
                                LocalDate.of(2026, 3, 27),
                                "ORH",
                                "VIRTUAL",
                                1
                        ),
                        actividad(
                                "EVALUACION_CURRICULAR",
                                "Evaluación curricular",
                                LocalDate.of(2026, 3, 20),
                                LocalDate.of(2026, 3, 31),
                                "COMITE",
                                "SEDE CENTRAL",
                                2
                        )
                ))
                .build();

        DomainException ex = assertThrows(
                DomainException.class,
                () -> service.registrarCronograma(1L, request, "orh_user", httpReq)
        );

        assertTrue(ex.getMessage().contains("no puede iniciar antes"));
    }

    @Test
    @DisplayName("E10: Etapa duplicada -> 400")
    void registrarCronograma_etapaDuplicada() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convocatoriaEnElaboracion(1L)));

        CronogramaRequest request = CronogramaRequest.builder()
                .actividades(List.of(
                        actividad(
                                "POSTULACION",
                                "Recepción de postulaciones",
                                LocalDate.of(2026, 3, 16),
                                LocalDate.of(2026, 3, 27),
                                "ORH",
                                "VIRTUAL",
                                1
                        ),
                        actividad(
                                "POSTULACION",
                                "Otra postulación",
                                LocalDate.of(2026, 3, 18),
                                LocalDate.of(2026, 3, 28),
                                "ORH",
                                "VIRTUAL",
                                2
                        )
                ))
                .build();

        DomainException ex = assertThrows(
                DomainException.class,
                () -> service.registrarCronograma(1L, request, "orh_user", httpReq)
        );

        assertTrue(ex.getMessage().contains("Solo se permite una actividad por etapa"));
    }

    @Test
    @DisplayName("E10: Lista vacía de actividades -> 400")
    void registrarCronograma_listaVacia() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convocatoriaEnElaboracion(1L)));

        CronogramaRequest request = CronogramaRequest.builder()
                .actividades(List.of())
                .build();

        DomainException ex = assertThrows(
                DomainException.class,
                () -> service.registrarCronograma(1L, request, "orh_user", httpReq)
        );

        assertTrue(ex.getMessage().contains("al menos una actividad"));
    }

    private Convocatoria convocatoriaEnElaboracion(Long id) {
        return Convocatoria.builder()
                .idConvocatoria(id)
                .numeroConvocatoria("CAS-001-2026")
                .estado(EstadoConvocatoria.EN_ELABORACION)
                .build();
    }

    private CronogramaRequest.ActividadItem actividad(
            String etapa,
            String actividad,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            String responsable,
            String lugar,
            Integer orden
    ) {
        return CronogramaRequest.ActividadItem.builder()
                .etapa(etapa)
                .actividad(actividad)
                .fechaInicio(fechaInicio)
                .fechaFin(fechaFin)
                .responsable(responsable)
                .lugar(lugar)
                .orden(orden)
                .build();
    }
}