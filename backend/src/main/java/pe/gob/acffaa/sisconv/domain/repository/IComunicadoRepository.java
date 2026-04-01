package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.Comunicado;
import java.util.List;

public interface IComunicadoRepository {
    Comunicado save(Comunicado c);
    List<Comunicado> findByConvocatoriaId(Long idConvocatoria);
    boolean existsByConvocatoriaId(Long idConvocatoria);
}
