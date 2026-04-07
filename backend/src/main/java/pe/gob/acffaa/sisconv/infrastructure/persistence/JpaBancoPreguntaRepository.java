package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.model.BancoPregunta;
import java.util.List;

public interface JpaBancoPreguntaRepository extends JpaRepository<BancoPregunta, Long> {
    List<BancoPregunta> findByConvocatoriaIdConvocatoriaAndEstadoOrderByNumeroPregunta(Long idConv, String estado);
    List<BancoPregunta> findByConvocatoriaIdConvocatoriaOrderByNumeroPregunta(Long idConv);
    long countByConvocatoriaIdConvocatoria(Long idConv);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM BancoPregunta p WHERE p.convocatoria.idConvocatoria = :id")
    void deleteByConvocatoriaIdConvocatoria(@Param("id") Long id);
}
