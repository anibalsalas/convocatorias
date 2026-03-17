package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.Acta;
import java.util.Optional;

public interface JpaActaRepository extends JpaRepository<Acta, Long> {
    Optional<Acta> findByConvocatoriaIdConvocatoriaAndTipoActa(Long idConvocatoria, String tipoActa);
}
