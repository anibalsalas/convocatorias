package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.LogTransparencia;
import pe.gob.acffaa.sisconv.domain.repository.ILogTransparenciaRepository;

@Repository
public class LogTransparenciaRepositoryAdapter implements ILogTransparenciaRepository {
    private final JpaLogTransparenciaRepository jpa;
    public LogTransparenciaRepositoryAdapter(JpaLogTransparenciaRepository jpa) { this.jpa = jpa; }

    @Override public LogTransparencia save(LogTransparencia log) { return jpa.save(log); }
    @Override public Page<LogTransparencia> findAll(Pageable p) { return jpa.findAll(p); }
    @Override public Page<LogTransparencia> findByEntidadAndIdEntidad(String e, Long id, Pageable p) { return jpa.findByEntidadAndIdEntidad(e, id, p); }
    @Override public Page<LogTransparencia> findByUsuarioAccion(String u, Pageable p) { return jpa.findByUsuarioAccion(u, p); }
    @Override public Page<LogTransparencia> findByIdConvocatoria(Long id, Pageable p) { return jpa.findByIdConvocatoria(id, p); }
    @Override public long count() { return jpa.count(); }
}
