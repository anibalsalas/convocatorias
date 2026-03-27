-- V18: Agrega columna OBSERVACION_DL a TBL_POSTULACION
-- Trazabilidad legal D.L. 1451 — observación del evaluador ORH (SERVIR/OCI)
-- Relacionado: Bug E19 — observacion se recolectaba en frontend pero se descartaba en backend

ALTER TABLE TBL_POSTULACION ADD OBSERVACION_DL VARCHAR2(500);
