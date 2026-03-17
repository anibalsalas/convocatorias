package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.Postulante;
import java.util.Optional;
public interface JpaPostulanteRepository extends JpaRepository<Postulante,Long>{
    Optional<Postulante> findByTipoDocumentoAndNumeroDocumento(String t,String n);
    Optional<Postulante> findByUsuario_IdUsuario(Long idUsuario);
}
