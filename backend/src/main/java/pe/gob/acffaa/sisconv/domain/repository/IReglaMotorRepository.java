package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.ReglaMotor;
import java.util.List;

/**
 * Puerto de salida para persistencia de ReglaMotor — SAD §3.3 SOLID-D.
 * E8: Configurar Motor de Reglas RF-14 (CU-05).
 */
public interface IReglaMotorRepository {

    ReglaMotor save(ReglaMotor regla);

    List<ReglaMotor> saveAll(List<ReglaMotor> reglas);

    List<ReglaMotor> findByIdRequerimiento(Long idRequerimiento);

    void deleteByIdRequerimiento(Long idRequerimiento);
}
