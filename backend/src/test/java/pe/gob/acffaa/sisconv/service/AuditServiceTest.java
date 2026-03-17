package pe.gob.acffaa.sisconv.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import pe.gob.acffaa.sisconv.infrastructure.audit.AuditService;
import pe.gob.acffaa.sisconv.domain.model.LogTransparencia;
import pe.gob.acffaa.sisconv.domain.repository.ILogTransparenciaRepository;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests para AuditService — Trazabilidad RF-18 | SAD §5.3 AOP
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Audit Service — Trazabilidad RF-18")
class AuditServiceTest {

    @Autowired private AuditService auditService;
    @Autowired private ILogTransparenciaRepository logRepo;

    @Test
    @DisplayName("Debe registrar operación con todos los campos")
    void shouldLogOperation() {
        long countBefore = logRepo.count();
        auditService.registrar("TBL_USUARIO", 1L, "CREAR", null, "ACTIVO", null, "Roles: [ADMIN]");
        long countAfter = logRepo.count();
        assertEquals(countBefore + 1, countAfter);

        Page<LogTransparencia> logs = logRepo.findByEntidadAndIdEntidad("TBL_USUARIO", 1L, PageRequest.of(0, 10));
        assertFalse(logs.isEmpty());
        LogTransparencia log = logs.getContent().get(0);
        assertEquals("CREAR", log.getAccion());
        assertEquals("ACTIVO", log.getEstadoNuevo());
        assertNotNull(log.getFechaAccion());
        assertNotNull(log.getUsuarioAccion());
    }

    @Test
    @DisplayName("Debe registrar log con contexto de convocatoria")
    void shouldLogWithConvocatoriaContext() {
        auditService.registrarConvocatoria(99L, "TBL_CONVOCATORIA", 99L,
                "PUBLICAR", "BORRADOR", "PUBLICADA", null);
        Page<LogTransparencia> logs = logRepo.findByIdConvocatoria(99L, PageRequest.of(0, 10));
        assertFalse(logs.isEmpty());
        assertEquals("PUBLICAR", logs.getContent().get(0).getAccion());
    }

    @Test
    @DisplayName("Usuario por defecto es SISTEMA cuando no hay autenticación")
    void shouldDefaultToSistemaUser() {
        auditService.registrar("TBL_ROL", 1L, "SEED", null);
        Page<LogTransparencia> logs = logRepo.findByEntidadAndIdEntidad("TBL_ROL", 1L, PageRequest.of(0, 10));
        assertFalse(logs.isEmpty());
        assertEquals("SISTEMA", logs.getContent().get(0).getUsuarioAccion());
    }
}
