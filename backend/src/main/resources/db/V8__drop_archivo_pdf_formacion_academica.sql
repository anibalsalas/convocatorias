-- Ejecutar DESPUÉS de migrar todos los BLOB a disco y verificar que RUTA_ARCHIVO está poblado
-- Solo ejecutar cuando no queden registros con RUTA_ARCHIVO NULL

ALTER TABLE SISCONV.TBL_POSTULANTE_FORMACION_ACA DROP COLUMN ARCHIVO_PDF;
