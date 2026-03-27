package pe.gob.acffaa.sisconv.presentation.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.gob.acffaa.sisconv.application.dto.response.ApiResponse;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.AreaOrganizacional;
import pe.gob.acffaa.sisconv.domain.repository.IAreaOrganizacionalRepository;

import java.util.List;

/**
 * M10-AREAS — Gestión de Áreas Organizacionales — AF §7.2 Nivel 0 Catálogos
 * Solo ROLE_ADMIN — GET /admin/areas, POST /admin/areas, PUT /admin/areas/{id}
 */
@RestController
@RequestMapping("/admin/areas")
@PreAuthorize("hasRole('ADMIN')")
public class AreaOrganizacionalController {

    private final IAreaOrganizacionalRepository areaRepo;

    public AreaOrganizacionalController(IAreaOrganizacionalRepository areaRepo) {
        this.areaRepo = areaRepo;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AreaOrganizacional>>> listar() {
        return ResponseEntity.ok(ApiResponse.ok(areaRepo.findAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AreaOrganizacional>> crear(
            @Valid @RequestBody AreaRequest request) {
        if (areaRepo.existsByCodigoArea(request.getCodigoArea())) {
            throw new DomainException("Código de área ya existe: " + request.getCodigoArea());
        }
        AreaOrganizacional area = AreaOrganizacional.builder()
                .codigoArea(request.getCodigoArea().toUpperCase())
                .nombreArea(request.getNombreArea())
                .sigla(request.getSigla())
                .tipoArea(request.getTipoArea())
                .responsable(request.getResponsable())
                .estado("ACTIVO")
                .build();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(areaRepo.save(area), "Área creada"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AreaOrganizacional>> actualizar(
            @PathVariable Long id, @Valid @RequestBody AreaRequest request) {
        AreaOrganizacional area = areaRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Área", id));
        area.setNombreArea(request.getNombreArea());
        area.setSigla(request.getSigla());
        area.setTipoArea(request.getTipoArea());
        area.setResponsable(request.getResponsable());
        area.setEstado(request.getEstado() != null ? request.getEstado() : area.getEstado());
        return ResponseEntity.ok(ApiResponse.ok(areaRepo.save(area), "Área actualizada"));
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class AreaRequest {
        @NotBlank private String codigoArea;
        @NotBlank private String nombreArea;
        private String sigla;
        private String tipoArea;
        private String responsable;
        private String estado;
    }
}
