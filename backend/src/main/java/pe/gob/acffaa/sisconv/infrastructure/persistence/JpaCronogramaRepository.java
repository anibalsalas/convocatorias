package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.Cronograma;
import java.util.List;

public interface JpaCronogramaRepository extends JpaRepository<Cronograma, Long> {
    List<Cronograma> findByConvocatoriaIdConvocatoriaOrderByOrden(Long idConvocatoria);
    void deleteByConvocatoriaIdConvocatoria(Long idConvocatoria);
}
