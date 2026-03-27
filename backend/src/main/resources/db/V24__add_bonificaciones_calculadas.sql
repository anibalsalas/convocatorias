-- V24: Flag que indica que E28 Bonificaciones fue ejecutado para esta convocatoria
-- Requerido para habilitar E29 Cuadro de Méritos (gate frontend + validación backend)
ALTER TABLE TBL_CONVOCATORIA ADD (
    BONIFICACIONES_CALCULADAS NUMBER(1) DEFAULT 0 NOT NULL
);
