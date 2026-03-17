package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.EntrevistaMiembro;
import java.util.List;
public interface JpaEntrevistaMiembroRepository extends JpaRepository<EntrevistaMiembro,Long>{
    List<EntrevistaMiembro> findByEntrevistaIdEntrevista(Long id);
}
