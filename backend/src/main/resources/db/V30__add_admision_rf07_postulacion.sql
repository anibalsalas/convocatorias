-- ============================================================
-- V30 — Admisión RF-07 por postulante (Filtro de Requisitos Mínimos individual)
-- TBL_POSTULACION.ADMISION_RF07
-- Valores: NULL (pendiente) | 'ADMITIDO' | 'NO_ADMITIDO'
-- Gate E24: estado=VERIFICADO AND admisionRf07=ADMITIDO
-- ============================================================

ALTER TABLE TBL_POSTULACION
  ADD ADMISION_RF07 VARCHAR2(20)
  DEFAULT NULL;

ALTER TABLE TBL_POSTULACION
  ADD CONSTRAINT CK_POST_ADMISION_RF07
  CHECK (ADMISION_RF07 IN ('ADMITIDO', 'NO_ADMITIDO'));

COMMIT;
