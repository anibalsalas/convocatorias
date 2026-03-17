package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.EntrevistaMiembro;
import java.util.List;

public interface IEntrevistaMiembroRepository {
    EntrevistaMiembro save(EntrevistaMiembro e);
    List<EntrevistaMiembro> saveAll(List<EntrevistaMiembro> list);
    List<EntrevistaMiembro> findByEntrevistaId(Long id);
}
