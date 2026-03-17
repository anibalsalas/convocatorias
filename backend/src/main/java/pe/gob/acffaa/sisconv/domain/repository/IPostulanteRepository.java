package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.Postulante;
import java.util.*;

public interface IPostulanteRepository {
    Postulante save(Postulante p);
    Optional<Postulante> findById(Long id);
    Optional<Postulante> findByTipoDocumentoAndNumeroDocumento(String tipo, String numero);
    Optional<Postulante> findByUsuario_IdUsuario(Long idUsuario);
    List<Postulante> findAll();
}
