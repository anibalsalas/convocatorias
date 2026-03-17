package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.DeclaracionJurada;
import java.util.List;

public interface IDeclaracionJuradaRepository {
    DeclaracionJurada save(DeclaracionJurada d);
    List<DeclaracionJurada> findByPostulacionId(Long id);
}
