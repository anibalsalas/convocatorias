package pe.gob.acffaa.sisconv.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import pe.gob.acffaa.sisconv.application.dto.request.AprobarPerfilRequest;
import pe.gob.acffaa.sisconv.application.dto.request.PerfilPuestoRequest;
import pe.gob.acffaa.sisconv.application.dto.request.ValidarPerfilRequest;
import pe.gob.acffaa.sisconv.application.dto.response.PerfilPuestoContextResponse;
import pe.gob.acffaa.sisconv.application.dto.response.PerfilPuestoResponse;
import pe.gob.acffaa.sisconv.application.mapper.PerfilPuestoMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.application.service.NotificacionService;
import pe.gob.acffaa.sisconv.application.service.PerfilPuestoService;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.model.AreaOrganizacional;
import pe.gob.acffaa.sisconv.domain.model.PerfilPuesto;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.IAreaOrganizacionalRepository;
import pe.gob.acffaa.sisconv.domain.repository.IPerfilPuestoRepository;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;
import pe.gob.acffaa.sisconv.infrastructure.persistence.JpaRequerimientoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PerfilPuestoService")
class PerfilPuestoServiceTest {

    @Mock private IPerfilPuestoRepository perfilRepo;
    @Mock private PerfilPuestoMapper mapper;
    @Mock private IAuditPort auditPort;
    @Mock private JpaRequerimientoRepository requerimientoRepo;
    @Mock private NotificacionService notificacionService;
    @Mock private IUsuarioRepository usuarioRepository;
    @Mock private IAreaOrganizacionalRepository areaRepository;

    @InjectMocks
    private PerfilPuestoService service;

    private PerfilPuesto perfil;
    private PerfilPuestoResponse response;
    private PerfilPuestoRequest request;

    @BeforeEach
    void setUp() {
        perfil = PerfilPuesto.builder()
                .idPerfilPuesto(1L)
                .denominacionPuesto("ANALISTA CAS")
                .unidadOrganica("OFICINA DE INFORMÁTICA")
                .idAreaSolicitante(4L)
                .cantidadPuestos(1)
                .estado("PENDIENTE")
                .usuarioCreacion("asalas")
                .fechaCreacion(LocalDateTime.now())
                .build();

        response = PerfilPuestoResponse.builder()
                .idPerfilPuesto(1L)
                .denominacionPuesto("ANALISTA CAS")
                .unidadOrganica("OFICINA DE INFORMÁTICA")
                .idAreaSolicitante(4L)
                .cantidadPuestos(1)
                .estado("PENDIENTE")
                .build();

        request = new PerfilPuestoRequest();
        request.setDenominacionPuesto("ANALISTA CAS");
        request.setUnidadOrganica("OFICINA DE INFORMÁTICA");
        request.setIdAreaSolicitante(4L);
        request.setCantidadPuestos(1);
        request.setMisionPuesto("Brindar soporte institucional.");
    }

    @Test
    void listarConFiltroRetornaPagina() {
        Pageable pageable = PageRequest.of(0, 10);
        when(perfilRepo.findByEstado("PENDIENTE", pageable)).thenReturn(new PageImpl<>(List.of(perfil)));
        when(mapper.toResponse(perfil)).thenReturn(response);
        when(requerimientoRepo.existsByPerfilPuesto_IdPerfilPuestoAndEstadoIn(anyLong(), anySet())).thenReturn(false);

        Page<PerfilPuestoResponse> result = service.listar("PENDIENTE", null, pageable);

        assertEquals(1, result.getTotalElements());
        verify(perfilRepo).findByEstado("PENDIENTE", pageable);
    }

    @Test
    void obtenerContextoRegistroRetornaAreaDelUsuario() {
        Usuario usuario = Usuario.builder().idUsuario(1L).username("asalas").idArea(4L).build();
        AreaOrganizacional area = AreaOrganizacional.builder().idArea(4L).nombreArea("Oficina de Informática").build();
        when(usuarioRepository.findByUsername("asalas")).thenReturn(Optional.of(usuario));
        when(areaRepository.findById(4L)).thenReturn(Optional.of(area));

        PerfilPuestoContextResponse result = service.obtenerContextoRegistro("asalas");

        assertEquals(4L, result.idAreaSolicitante());
        assertEquals("OFICINA DE INFORMÁTICA", result.unidadOrganica());
    }

    @Test
    void crearPerfilSinUsuarioAreaLanzaError() {
        when(usuarioRepository.findByUsername("asalas")).thenReturn(Optional.empty());
        assertThrows(DomainException.class, () -> service.crear(request, "asalas", null));
    }

    @Test
    void validarPerfilActualizaEstado() {
        when(perfilRepo.findById(1L)).thenReturn(Optional.of(perfil));
        when(perfilRepo.save(any(PerfilPuesto.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mapper.toResponse(any(PerfilPuesto.class))).thenReturn(
                PerfilPuestoResponse.builder().idPerfilPuesto(1L).estado("VALIDADO").validadoContraMpp(true).build()
        );
        when(requerimientoRepo.existsByPerfilPuesto_IdPerfilPuestoAndEstadoIn(anyLong(), anySet())).thenReturn(false);

        PerfilPuestoResponse result = service.validar(1L, ValidarPerfilRequest.builder().cumpleMpp(true).build(), "orh", null);

        assertEquals("VALIDADO", result.getEstado());
    }

    @Test
    void aprobarPerfilExigeEstadoValidado() {
        when(perfilRepo.findById(1L)).thenReturn(Optional.of(perfil));
        assertThrows(DomainException.class,
                () -> service.aprobar(1L, AprobarPerfilRequest.builder().aprobado(true).build(), "orh", null));
    }
}
