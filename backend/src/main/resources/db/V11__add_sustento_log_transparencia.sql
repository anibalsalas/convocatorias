-- ============================================================
-- V11: Campo SUSTENTO obligatorio en TBL_LOG_TRANSPARENCIA
-- D.L. 1451: Trazabilidad legal de cambios de estado
-- Toda transicion debe incluir justificacion escrita (min. 10 chars)
-- ============================================================

-- 1. Agregar columna nullable para poder retroalimentar datos existentes antes de NOT NULL
ALTER TABLE SISCONV.TBL_LOG_TRANSPARENCIA
    ADD SUSTENTO VARCHAR2(1000);

-- 2. Retroalimentar registros historicos con sustento derivado de la accion
--    Nota: los DDL de Oracle hacen auto-commit implicito, por lo que el UPDATE
--    queda consolidado cuando el siguiente ALTER TABLE se ejecuta.
UPDATE SISCONV.TBL_LOG_TRANSPARENCIA
SET SUSTENTO = 'Registro migrado V11 - accion: ' || ACCION
        || CASE WHEN ESTADO_ANTERIOR IS NOT NULL
               THEN ' | ' || ESTADO_ANTERIOR || ' -> ' || COALESCE(ESTADO_NUEVO, '?')
               ELSE '' END
WHERE SUSTENTO IS NULL;

-- 3. Activar restriccion NOT NULL (el DDL hace commit implicito del UPDATE anterior)
ALTER TABLE SISCONV.TBL_LOG_TRANSPARENCIA
    MODIFY SUSTENTO VARCHAR2(1000) NOT NULL;

-- 4. Agregar constraint CHECK (minimo 10 caracteres no blancos)
ALTER TABLE SISCONV.TBL_LOG_TRANSPARENCIA
    ADD CONSTRAINT CK_LOG_SUSTENTO CHECK (LENGTH(TRIM(SUSTENTO)) >= 10);
