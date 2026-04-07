package pe.gob.acffaa.sisconv.domain.repository;

import pe.gob.acffaa.sisconv.domain.model.DenominacionPuesto;

import java.util.List;

/**
 * Puerto de salida para catálogo TBL_DENOMINACION_PUESTO.
 */
public interface IDenominacionPuestoRepository {

    /** Lista todas las denominaciones ordenadas por ORDEN. */
    List<DenominacionPuesto> findAllOrderByOrden();
}
