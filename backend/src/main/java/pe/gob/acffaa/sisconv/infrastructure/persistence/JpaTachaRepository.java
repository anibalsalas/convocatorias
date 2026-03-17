package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.Tacha;
import java.util.List;
public interface JpaTachaRepository extends JpaRepository<Tacha,Long>{
    List<Tacha> findByConvocatoriaIdConvocatoria(Long ic);
    List<Tacha> findByPostulacionIdPostulacion(Long ip);
}
