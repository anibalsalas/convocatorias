package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.Comunicado;
import java.util.List;

public interface JpaComunicadoRepository extends JpaRepository<Comunicado, Long> {
    List<Comunicado> findByConvocatoria_IdConvocatoriaOrderByFechaPublicacionDesc(Long idConvocatoria);
    boolean existsByConvocatoria_IdConvocatoria(Long idConvocatoria);
}
