package pe.gob.acffaa.sisconv.service;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.mapper.SeleccionMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.service.NotificacionService;
import pe.gob.acffaa.sisconv.application.service.PostulacionService;
import pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria;
import pe.gob.acffaa.sisconv.domain.exception.*;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.domain.repository.*;
import pe.gob.acffaa.sisconv.domain.repository.IEvaluacionCurricularRepository;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PKG-03: PostulacionService Tests (E17-E23)")
class PostulacionServiceTest {

    @Mock private IPostulacionRepository postRepo;
    @Mock private IPostulanteRepository postulanteRepo;
    @Mock private IConvocatoriaRepository convRepo;
    @Mock private IDeclaracionJuradaRepository ddjjRepo;
    @Mock private IExpedienteVirtualRepository expRepo;
    @Mock private ITachaRepository tachaRepo;
    @Mock private IUsuarioRepository usuarioRepo;
    @Mock private IAuditPort audit;
    @Mock private IEvaluacionCurricularRepository evalCurrRepo;
    @Mock private IConfigExamenRepository configExamenRepo;
    @Mock private IExamenPostulanteRepository examenPostulanteRepo;
    @Mock private HttpServletRequest http;
    @Mock private NotificacionService notificacionService;

    private PostulacionService service;

    private final SeleccionMapper mapper = new SeleccionMapper();

    @BeforeEach
    void setUp() {
        service = new PostulacionService(
                postRepo,
                postulanteRepo,
                convRepo,
                ddjjRepo,
                expRepo,
                tachaRepo,
                usuarioRepo,
                audit,
                mapper,
                notificacionService,
                evalCurrRepo,
                configExamenRepo,
                examenPostulanteRepo
        );

        lenient().when(http.getRemoteAddr()).thenReturn("127.0.0.1");

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin_test", null, List.of())
        );

        lenient().when(usuarioRepo.findByUsername(anyString())).thenReturn(Optional.empty());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ── Helpers ──

    private Convocatoria convPublicada() {
        return Convocatoria.builder().idConvocatoria(1L)
                .numeroConvocatoria("CAS-001-2026").estado(EstadoConvocatoria.PUBLICADA).build();
    }

    private Postulante postulanteMock() {
        return Postulante.builder().idPostulante(10L)
                .tipoDocumento("DNI").numeroDocumento("12345678")
                .nombres("Juan").apellidoPaterno("Perez").apellidoMaterno("Lopez")
                .esLicenciadoFfaa(false).esPersonaDiscap(false).esDeportistaDest(false).build();
    }

    private Postulacion postulacionMock(String estado) {
        return Postulacion.builder().idPostulacion(100L)
                .convocatoria(convPublicada()).postulante(postulanteMock())
                .estado(estado).build();
    }

    private PostulacionRequest reqValido() {
        return PostulacionRequest.builder()
                .idConvocatoria(1L).tipoDocumento("DNI").numeroDocumento("12345678")
                .nombres("Juan").apellidoPaterno("Perez")
                .declaracionesJuradas(List.of(
                        PostulacionRequest.DdjjItem.builder().tipoDeclaracion("VERACIDAD").aceptada(true).build(),
                        PostulacionRequest.DdjjItem.builder().tipoDeclaracion("ANTECEDENTES").aceptada(true).build(),
                        PostulacionRequest.DdjjItem.builder().tipoDeclaracion("NEPOTISMO").aceptada(true).build()
                )).build();
    }

    // ── E17 Tests ──

    @Test
    @DisplayName("E17: Registrar postulacion exitosa")
    void e17_registrarExitoso() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convPublicada()));
        when(postulanteRepo.findByTipoDocumentoAndNumeroDocumento("DNI", "12345678"))
                .thenReturn(Optional.of(postulanteMock()));
        when(postRepo.findByConvocatoriaIdAndPostulanteId(1L, 10L)).thenReturn(Optional.empty());
        when(postRepo.save(any())).thenReturn(postulacionMock("REGISTRADO"));
        when(ddjjRepo.save(any())).thenReturn(DeclaracionJurada.builder().build());

        PostulacionResponse r = service.registrar(reqValido(), http);
        assertNotNull(r);
        assertEquals("REGISTRADO", r.getEstado());
        verify(audit).registrar(eq("POSTULACION"), any(), eq("CREAR"), isNull(), eq("REGISTRADO"), eq(http), isNull());
    }

    @Test
    @DisplayName("E17: Convocatoria no encontrada -> 404")
    void e17_convNoEncontrada() {
        when(convRepo.findById(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.registrar(reqValido(), http));
    }

    @Test
    @DisplayName("E17: Convocatoria estado invalido -> 400")
    void e17_estadoInvalido() {
        Convocatoria c = convPublicada();
        c.setEstado(EstadoConvocatoria.EN_ELABORACION);
        when(convRepo.findById(1L)).thenReturn(Optional.of(c));
        assertThrows(DomainException.class, () -> service.registrar(reqValido(), http));
    }

    @Test
    @DisplayName("E17: DDJJ incompletas -> 400 (RN-11)")
    void e17_ddjjIncompletas() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convPublicada()));
        PostulacionRequest req = reqValido();
        req.setDeclaracionesJuradas(List.of(
                PostulacionRequest.DdjjItem.builder().tipoDeclaracion("VERACIDAD").aceptada(true).build()
        ));
        assertThrows(DomainException.class, () -> service.registrar(req, http));
    }

    @Test
    @DisplayName("E17: DDJJ no aceptada -> 400")
    void e17_ddjjNoAceptada() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convPublicada()));
        PostulacionRequest req = reqValido();
        req.getDeclaracionesJuradas().get(0).setAceptada(false);
        assertThrows(DomainException.class, () -> service.registrar(req, http));
    }

    @Test
    @DisplayName("E17: Postulante duplicado UK -> 400 (RN-10)")
    void e17_duplicado() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convPublicada()));
        when(postulanteRepo.findByTipoDocumentoAndNumeroDocumento("DNI", "12345678"))
                .thenReturn(Optional.of(postulanteMock()));
        when(postRepo.findByConvocatoriaIdAndPostulanteId(1L, 10L))
                .thenReturn(Optional.of(postulacionMock("REGISTRADO")));
        assertThrows(DomainException.class, () -> service.registrar(reqValido(), http));
    }

    // ── E18 Tests ──

    @Test
    @DisplayName("E18: Cargar expediente exitoso con SHA-256")
    void e18_cargarExitoso() {
        when(postRepo.findById(100L)).thenReturn(Optional.of(postulacionMock("REGISTRADO")));
        when(expRepo.save(any())).thenAnswer(inv -> {
            ExpedienteVirtual e = inv.getArgument(0);
            e.setIdExpediente(1L);
            return e;
        });

        ExpedienteResponse r = service.cargarExpediente(100L, "CV", "cv.pdf", "contenido".getBytes(), http);
        assertNotNull(r);
        assertNotNull(r.getHashSha256());
        assertEquals(64, r.getHashSha256().length());
    }

    @Test
    @DisplayName("E18: Postulacion no encontrada -> 404")
    void e18_postNoEncontrada() {
        when(postRepo.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.cargarExpediente(999L, "CV", "f.pdf", "x".getBytes(), http));
    }

    @Test
    @DisplayName("E18: Archivo vacio -> 400")
    void e18_archivoVacio() {
        when(postRepo.findById(100L)).thenReturn(Optional.of(postulacionMock("REGISTRADO")));
        assertThrows(DomainException.class,
                () -> service.cargarExpediente(100L, "CV", "f.pdf", new byte[0], http));
    }

    // ── E19 Tests ──

    @Test
    @DisplayName("E19: Verificacion DL1451 sin sanciones -> estado NO cambia (sigue REGISTRADO)")
    void e19_sinSanciones() {
        Postulacion p = postulacionMock("REGISTRADO");
        when(postRepo.findById(100L)).thenReturn(Optional.of(p));
        when(postRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        VerificacionDl1451Request req = VerificacionDl1451Request.builder()
                .verificacionRnssc("SIN_SANCIONES").verificacionRegiprec("SIN_SANCIONES")
                .observacion("Verificado en RNSSC y REGIPREC sin observaciones").build();

        PostulacionResponse r = service.verificarDl1451(100L, req, http);
        // E19 solo graba flags, NO cambia estado — el estado pasa a VERIFICADO recién en E20
        assertEquals("REGISTRADO", r.getEstado());
    }

    @Test
    @DisplayName("E19: Verificacion DL1451 con sanciones -> estado NO cambia (sigue REGISTRADO, E20 aplica NO_APTO)")
    void e19_conSanciones() {
        Postulacion p = postulacionMock("REGISTRADO");
        when(postRepo.findById(100L)).thenReturn(Optional.of(p));
        when(postRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        VerificacionDl1451Request req = VerificacionDl1451Request.builder()
                .verificacionRnssc("CON_SANCIONES").observacion("Sancion vigente").build();

        PostulacionResponse r = service.verificarDl1451(100L, req, http);
        // E19 solo graba flags — E20 es quien transiciona a NO_APTO al leer el flag CON_SANCIONES
        assertEquals("REGISTRADO", r.getEstado());
    }

    // ── E20 Tests ──

    @Test
    @DisplayName("E20: Filtro requisitos exitoso -> VERIFICADO (sin sanciones DL1451)")
    void e20_filtroExitoso() {
        Convocatoria conv = convPublicada();
        when(convRepo.findById(1L)).thenReturn(Optional.of(conv));
        when(convRepo.save(any())).thenReturn(conv);

        Postulacion p = postulacionMock("REGISTRADO");
        when(postRepo.findByConvocatoriaIdAndEstado(1L, "REGISTRADO")).thenReturn(List.of(p));
        when(postRepo.save(any())).thenReturn(p);

        PostulacionResponse r = service.filtroRequisitos(1L, http);
        assertNotNull(r);
        assertTrue(r.getMensaje().contains("Verificados:"));
    }

    @Test
    @DisplayName("E20: Sin postulaciones REGISTRADO -> convocatoria pasa a EN_SELECCION sin error")
    void e20_sinRegistrados() {
        Convocatoria conv = convPublicada();
        when(convRepo.findById(1L)).thenReturn(Optional.of(conv));
        when(convRepo.save(any())).thenReturn(conv);
        when(postRepo.findByConvocatoriaIdAndEstado(1L, "REGISTRADO")).thenReturn(List.of());

        PostulacionResponse r = service.filtroRequisitos(1L, http);
        assertNotNull(r);
        assertTrue(r.getMensaje().contains("EN_SELECCION"));
    }

    // ── E21 Tests ──

    @Test
    @DisplayName("E21: Registrar tacha exitosa")
    void e21_tachaExitosa() {
        Convocatoria conv = convPublicada();
        conv.setEstado(EstadoConvocatoria.EN_SELECCION);
        when(convRepo.findById(1L)).thenReturn(Optional.of(conv));
        when(postRepo.findById(100L)).thenReturn(Optional.of(postulacionMock("VERIFICADO")));
        when(tachaRepo.save(any())).thenAnswer(inv -> {
            Tacha t = inv.getArgument(0);
            t.setIdTacha(1L);
            return t;
        });

        TachaRequest req = TachaRequest.builder().idPostulacion(100L).motivo("Documento falso").build();
        TachaResponse r = service.registrarTacha(1L, req, http);
        assertNotNull(r);
        assertEquals("PRESENTADA", r.getEstado());
    }

    @Test
    @DisplayName("E21: Conv no EN_SELECCION -> 400")
    void e21_convNoEnSeleccion() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convPublicada()));
        TachaRequest req = TachaRequest.builder().idPostulacion(100L).motivo("motivo").build();
        assertThrows(DomainException.class, () -> service.registrarTacha(1L, req, http));
    }

    // ── E22 Tests ──

    @Test
    @DisplayName("E22: Resolver tacha FUNDADA -> DESCALIFICADO")
    void e22_tachaFundada() {
        Postulacion post = postulacionMock("VERIFICADO");
        Tacha tacha = Tacha.builder().idTacha(1L).estado("PRESENTADA").postulacion(post)
                .convocatoria(convPublicada()).build();

        when(tachaRepo.findById(1L)).thenReturn(Optional.of(tacha));
        when(tachaRepo.save(any())).thenReturn(tacha);
        when(postRepo.save(any())).thenReturn(post);
        when(usuarioRepo.findByUsername(any())).thenReturn(Optional.empty());

        ResolverTachaRequest req = ResolverTachaRequest.builder()
                .estado("FUNDADA").resolucion("Documentos falsificados").build();

        TachaResponse r = service.resolverTacha(1L, req, http);
        assertEquals("FUNDADA", r.getEstado());
    }

    @Test
    @DisplayName("E22: Tacha ya resuelta -> 400")
    void e22_tachaYaResuelta() {
        Tacha tacha = Tacha.builder().idTacha(1L).estado("FUNDADA").build();
        when(tachaRepo.findById(1L)).thenReturn(Optional.of(tacha));

        ResolverTachaRequest req = ResolverTachaRequest.builder()
                .estado("INFUNDADA").resolucion("ok").build();

        assertThrows(DomainException.class, () -> service.resolverTacha(1L, req, http));
    }

    // ── E23 Tests ──

    @Test
    @DisplayName("E23: Listar postulantes paginado")
    void e23_listarPaginado() {
        when(convRepo.findById(1L)).thenReturn(Optional.of(convPublicada()));
        Page<Postulacion> page = new PageImpl<>(List.of(postulacionMock("VERIFICADO")));
        when(postRepo.findByConvocatoriaId(eq(1L), any(Pageable.class))).thenReturn(page);

        Page<PostulacionResponse> r = service.listarPostulantes(1L, PageRequest.of(0, 20));
        assertNotNull(r);
        assertEquals(1, r.getTotalElements());
    }

    @Test
    @DisplayName("E23: Convocatoria no encontrada -> 404")
    void e23_convNoEncontrada() {
        when(convRepo.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.listarPostulantes(999L, PageRequest.of(0, 20)));
    }

    // ── Statechart Validation Tests ──

    @Test
    @DisplayName("Statechart: E20 REGISTRADO(CON_SANCIONES) → NO_APTO via filtroRequisitos")
    void statechart_registrado_a_noApto_via_e20() {
        Convocatoria conv = convPublicada();
        conv.setEstado(EstadoConvocatoria.EN_SELECCION);
        when(convRepo.findById(1L)).thenReturn(Optional.of(conv));
        when(convRepo.save(any())).thenReturn(conv);

        Postulacion p = postulacionMock("REGISTRADO");
        p.setVerificacionRnssc("CON_SANCIONES");
        p.setVerificacionRegiprec("SIN_SANCIONES");
        when(postRepo.findByConvocatoriaIdAndEstado(1L, "REGISTRADO")).thenReturn(List.of(p));
        when(postRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PostulacionResponse r = service.filtroRequisitos(1L, http);
        // E20 aplica NO_APTO cuando DL1451 tiene CON_SANCIONES
        assertTrue(r.getMensaje().contains("No aptos (DL1451): 1"));
    }

    @Test
    @DisplayName("Statechart: DESCALIFICADO desde NO_APTO → DomainException (terminal)")
    void statechart_noApto_a_descalificado_rechazado() {
        Tacha tacha = Tacha.builder().idTacha(1L).estado("PRESENTADA")
                .postulacion(postulacionMock("NO_APTO")).convocatoria(convPublicada()).build();

        when(tachaRepo.findById(1L)).thenReturn(Optional.of(tacha));
        when(tachaRepo.save(any())).thenReturn(tacha);
        when(usuarioRepo.findByUsername(any())).thenReturn(Optional.empty());

        ResolverTachaRequest req = ResolverTachaRequest.builder()
                .estado("FUNDADA").resolucion("Evidencia confirmada").build();

        assertThrows(DomainException.class, () -> service.resolverTacha(1L, req, http));
    }
}
