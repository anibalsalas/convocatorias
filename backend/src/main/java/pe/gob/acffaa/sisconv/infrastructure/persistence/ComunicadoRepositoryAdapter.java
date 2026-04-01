package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Comunicado;
import pe.gob.acffaa.sisconv.domain.repository.IComunicadoRepository;
import java.util.List;

@Repository
public class ComunicadoRepositoryAdapter implements IComunicadoRepository {

    private final JpaComunicadoRepository jpa;

    public ComunicadoRepositoryAdapter(JpaComunicadoRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public Comunicado save(Comunicado c) {
        return jpa.save(c);
    }

    @Override
    public List<Comunicado> findByConvocatoriaId(Long idConvocatoria) {
        return jpa.findByConvocatoria_IdConvocatoriaOrderByFechaPublicacionDesc(idConvocatoria);
    }

    @Override
    public boolean existsByConvocatoriaId(Long idConvocatoria) {
        return jpa.existsByConvocatoria_IdConvocatoria(idConvocatoria);
    }
}
