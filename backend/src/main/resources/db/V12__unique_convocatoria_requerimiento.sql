-- ============================================================
-- V12: UNIQUE constraint en ID_REQUERIMIENTO de TBL_CONVOCATORIA
-- Candado final de integridad — previene duplicados por concurrencia
-- Un requerimiento CONFIGURADO solo puede originar una convocatoria
-- ============================================================

ALTER TABLE SISCONV.TBL_CONVOCATORIA
    ADD CONSTRAINT UK_CONV_REQUERIMIENTO UNIQUE (ID_REQUERIMIENTO);
