package pe.gob.acffaa.sisconv.presentation.controller;

import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.gob.acffaa.sisconv.application.dto.response.ApiResponse;
import pe.gob.acffaa.sisconv.domain.model.LogTransparencia;
import pe.gob.acffaa.sisconv.domain.repository.ILogTransparenciaRepository;

/**
 * CU-28: Consultas Log Transparencia — AF §8 M10 | AF §9 RNF-04
 */
@RestController
@RequestMapping("/admin/logs")
@PreAuthorize("hasRole('ADMIN')")
public class LogTransparenciaController {

    private final ILogTransparenciaRepository logRepository;
    public LogTransparenciaController(ILogTransparenciaRepository logRepository) {
        this.logRepository = logRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<LogTransparencia>>> listar(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                logRepository.findAll(PageRequest.of(page, size, Sort.by("fechaAccion").descending()))));
    }

    @GetMapping("/entidad/{entidad}/{idEntidad}")
    public ResponseEntity<ApiResponse<Page<LogTransparencia>>> porEntidad(
            @PathVariable String entidad, @PathVariable Long idEntidad,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                logRepository.findByEntidadAndIdEntidad(entidad, idEntidad,
                        PageRequest.of(page, size, Sort.by("fechaAccion").descending()))));
    }

    @GetMapping("/convocatoria/{idConvocatoria}")
    public ResponseEntity<ApiResponse<Page<LogTransparencia>>> porConvocatoria(
            @PathVariable Long idConvocatoria,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                logRepository.findByIdConvocatoria(idConvocatoria,
                        PageRequest.of(page, size, Sort.by("fechaAccion").descending()))));
    }
}
