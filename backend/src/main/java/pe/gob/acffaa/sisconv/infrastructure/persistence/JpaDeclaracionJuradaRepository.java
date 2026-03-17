package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.DeclaracionJurada;
import java.util.List;
public interface JpaDeclaracionJuradaRepository extends JpaRepository<DeclaracionJurada,Long>{
    List<DeclaracionJurada> findByPostulacionIdPostulacion(Long id);
}
