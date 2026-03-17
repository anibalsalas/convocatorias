package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.Bonificacion;
import java.util.List;

public interface IBonificacionRepository {
    Bonificacion save(Bonificacion b);
    List<Bonificacion> saveAll(List<Bonificacion> list);
    List<Bonificacion> findByPostulacionId(Long id);
}
