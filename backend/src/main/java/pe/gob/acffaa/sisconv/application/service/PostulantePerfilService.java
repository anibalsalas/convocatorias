package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import pe.gob.acffaa.sisconv.application.dto.request.ActualizarPerfilPostulanteRequest;
import pe.gob.acffaa.sisconv.application.dto.response.PostulantePerfilResponse;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.domain.exception.DomainException;
import pe.gob.acffaa.sisconv.domain.exception.ResourceNotFoundException;
import pe.gob.acffaa.sisconv.domain.model.Postulante;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteRepository;

@Service
public class PostulantePerfilService {

    private final IPostulanteRepository postulanteRepo;
    private final IAuditPort auditPort;

    public PostulantePerfilService(IPostulanteRepository postulanteRepo, IAuditPort auditPort) {
        this.postulanteRepo = postulanteRepo;
        this.auditPort = auditPort;
    }

    public PostulantePerfilResponse obtenerPorUsuario(Long idUsuario) {
        Postulante postulante = postulanteRepo.findByUsuario_IdUsuario(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Postulante", idUsuario));

        return toResponse(postulante);
    }

    @Transactional
    public PostulantePerfilResponse actualizar(Long idUsuario,
                                               ActualizarPerfilPostulanteRequest req,
                                               String username,
                                               HttpServletRequest httpReq) {

        Postulante postulante = postulanteRepo.findByUsuario_IdUsuario(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Postulante", idUsuario));

        postulante.setNombres(normalizeUpper(req.getNombres()));
        postulante.setApellidoPaterno(normalizeUpper(req.getApellidoPaterno()));
        postulante.setApellidoMaterno(normalizeUpper(req.getApellidoMaterno()));
        postulante.setFechaNacimiento(req.getFechaNacimiento());
        postulante.setGenero(normalizeGenero(req.getGenero()));
        postulante.setEstadoCivil(normalizeUpper(req.getEstadoCivil()));
        postulante.setTelefono(normalizePhone(req.getTelefono()));
        postulante.setTelefonoFijo(normalizePhone(req.getTelefonoFijo()));
        postulante.setEmail(normalizeEmail(req.getEmail()));
        postulante.setDireccion(normalizeUpper(req.getDireccion()));
        postulante.setUbigeo(normalizeText(req.getUbigeo()));
        postulante.setRuc(normalizeDigits(req.getRuc()));
        postulante.setNroBrevete(normalizeUpper(req.getNroBrevete()));
        postulante.setCategoriaBrevete(normalizeUpper(req.getCategoriaBrevete()));
        postulante.setTieneColegiatura(booleanValue(req.getTieneColegiatura()));
        postulante.setTieneHabilitacionProf(booleanValue(req.getTieneHabilitacionProf()));
        postulante.setNroColegiatura(normalizeUpper(req.getNroColegiatura()));
        postulante.setEstaEnRedam(booleanValue(req.getEstaEnRedam()));
        postulante.setEstaEnRnssc(booleanValue(req.getEstaEnRnssc()));
        postulante.setEstaEnRedereci(booleanValue(req.getEstaEnRedereci()));
        postulante.setTieneAntecedentesPenales(booleanValue(req.getTieneAntecedentesPenales()));
        postulante.setTieneAntecedentesPoliciales(booleanValue(req.getTieneAntecedentesPoliciales()));
        postulante.setTieneAntecedentesJudiciales(booleanValue(req.getTieneAntecedentesJudiciales()));
        postulante.setAceptaDeclaracionJurada(booleanValue(req.getAceptaDeclaracionJurada()));
        postulante.setDetalleDeclaracionJurada(normalizeUpper(req.getDetalleDeclaracionJurada()));
        postulante.setUsuarioModificacion(username);

        postulante.setEsLicenciadoFfaa(booleanValue(req.getEsLicenciadoFfaa()));
        postulante.setEsPersonaDiscap(booleanValue(req.getEsPersonaDiscap()));
        postulante.setEsDeportistaDest(booleanValue(req.getEsDeportistaDest()));

        validarReglasNegocio(postulante);

        Postulante actualizado = postulanteRepo.save(postulante);
        auditPort.registrar("TBL_POSTULANTE", actualizado.getIdPostulante(), "ACTUALIZAR", httpReq);

        return toResponse(actualizado);
    }

    private void validarReglasNegocio(Postulante postulante) {
        boolean requiereColegiatura = Boolean.TRUE.equals(postulante.getTieneColegiatura())
                || Boolean.TRUE.equals(postulante.getTieneHabilitacionProf());

        if (requiereColegiatura && isBlank(postulante.getNroColegiatura())) {
            throw new DomainException("Debe ingresar el número de colegiatura cuando corresponda");
        }

        if (!Boolean.TRUE.equals(postulante.getAceptaDeclaracionJurada())) {
            throw new DomainException("Debe aceptar la declaración jurada para guardar su perfil");
        }
    }

    private PostulantePerfilResponse toResponse(Postulante p) {
        return PostulantePerfilResponse.builder()
                .idPostulante(p.getIdPostulante())
                .tipoDocumento(p.getTipoDocumento())
                .numeroDocumento(p.getNumeroDocumento())
                .nombres(p.getNombres())
                .apellidoPaterno(p.getApellidoPaterno())
                .apellidoMaterno(p.getApellidoMaterno())
                .fechaNacimiento(p.getFechaNacimiento())
                .genero(p.getGenero())
                .estadoCivil(p.getEstadoCivil())
                .telefono(p.getTelefono())
                .telefonoFijo(p.getTelefonoFijo())
                .email(p.getEmail())
                .direccion(p.getDireccion())
                .ubigeo(p.getUbigeo())
                .ruc(p.getRuc())
                .nroBrevete(p.getNroBrevete())
                .categoriaBrevete(p.getCategoriaBrevete())
                .tieneColegiatura(booleanValue(p.getTieneColegiatura()))
                .tieneHabilitacionProf(booleanValue(p.getTieneHabilitacionProf()))
                .nroColegiatura(p.getNroColegiatura())
                .estaEnRedam(booleanValue(p.getEstaEnRedam()))
                .estaEnRnssc(booleanValue(p.getEstaEnRnssc()))
                .estaEnRedereci(booleanValue(p.getEstaEnRedereci()))
                .tieneAntecedentesPenales(booleanValue(p.getTieneAntecedentesPenales()))
                .tieneAntecedentesPoliciales(booleanValue(p.getTieneAntecedentesPoliciales()))
                .tieneAntecedentesJudiciales(booleanValue(p.getTieneAntecedentesJudiciales()))
                .aceptaDeclaracionJurada(booleanValue(p.getAceptaDeclaracionJurada()))
                .detalleDeclaracionJurada(p.getDetalleDeclaracionJurada())
                .esLicenciadoFfaa(booleanValue(p.getEsLicenciadoFfaa()))
                .esPersonaDiscap(booleanValue(p.getEsPersonaDiscap()))
                .esDeportistaDest(booleanValue(p.getEsDeportistaDest()))
                .estado(p.getEstado())
                .build();
    }

    private String normalizeUpper(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized.toUpperCase();
    }

    private String normalizeEmail(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized.toLowerCase();
    }

    private String normalizePhone(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeDigits(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeGenero(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized.toUpperCase();
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private Boolean booleanValue(Boolean value) {
        return value != null ? value : false;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}