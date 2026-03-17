package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.gob.acffaa.sisconv.domain.model.ExpedienteVirtual;

import java.util.List;

public interface JpaExpedienteVirtualRepository extends JpaRepository<ExpedienteVirtual, Long> {
    List<ExpedienteVirtual> findByPostulacionIdPostulacion(Long idPostulacion);
    long countByPostulacionIdPostulacion(Long idPostulacion);
}