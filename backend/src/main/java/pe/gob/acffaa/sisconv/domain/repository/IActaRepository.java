package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.Acta;
import java.util.Optional;

public interface IActaRepository {
    Acta save(Acta acta);
    Optional<Acta> findById(Long id);
    Optional<Acta> findByConvocatoriaIdAndTipoActa(Long idConvocatoria, String tipoActa);
}
