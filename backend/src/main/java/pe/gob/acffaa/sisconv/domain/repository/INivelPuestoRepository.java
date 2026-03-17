package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.NivelPuesto;

import java.util.List;

/**
 * Puerto de salida para catálogo TBL_NIVEL_PUESTO.
 */
public interface INivelPuestoRepository {

    /** Lista todos los niveles ordenados por ORDEN. */
    List<NivelPuesto> findAllOrderByOrden();
}
