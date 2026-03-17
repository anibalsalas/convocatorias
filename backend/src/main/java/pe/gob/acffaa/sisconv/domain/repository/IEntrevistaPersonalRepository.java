package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.EntrevistaPersonal;
import java.util.Optional;

public interface IEntrevistaPersonalRepository {
    EntrevistaPersonal save(EntrevistaPersonal e);
    Optional<EntrevistaPersonal> findByPostulacionId(Long id);
}
