package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.ContratoCas;
import java.util.List;
import java.util.Optional;

public interface JpaContratoCasRepository extends JpaRepository<ContratoCas, Long> {
    List<ContratoCas> findByConvocatoriaIdConvocatoria(Long idConvocatoria);
    Optional<ContratoCas> findByConvocatoriaIdConvocatoriaAndProcesoEstado(Long idConvocatoria, String procesoEstado);
    Optional<ContratoCas> findByPostulacionIdPostulacion(Long idPostulacion);
    boolean existsByConvocatoriaIdConvocatoriaAndEstadoNot(Long idConvocatoria, String estado);
}
