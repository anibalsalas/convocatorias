package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.ExpedienteVirtual;

import java.util.List;
import java.util.Optional;

public interface IExpedienteVirtualRepository {
    ExpedienteVirtual save(ExpedienteVirtual e);
    Optional<ExpedienteVirtual> findById(Long id);
    List<ExpedienteVirtual> findByPostulacionId(Long idPostulacion);
    long countByPostulacionId(Long idPostulacion);
}