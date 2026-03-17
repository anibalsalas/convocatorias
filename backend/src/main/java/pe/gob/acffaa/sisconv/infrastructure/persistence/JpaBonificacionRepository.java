package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.Bonificacion;
import java.util.List;
public interface JpaBonificacionRepository extends JpaRepository<Bonificacion,Long>{
    List<Bonificacion> findByPostulacionIdPostulacion(Long id);
}
