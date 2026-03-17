-- Parte B: Almacenamiento externo para sustentos de formación académica
-- Ejecutar manualmente en Oracle antes de desplegar

-- 1. Agregar columna RUTA_ARCHIVO
ALTER TABLE SISCONV.TBL_POSTULANTE_FORMACION_ACA ADD RUTA_ARCHIVO VARCHAR2(500);

-- 2. Permitir ARCHIVO_PDF nullable para migración (los existentes se migrarán a disco)
ALTER TABLE SISCONV.TBL_POSTULANTE_FORMACION_ACA MODIFY ARCHIVO_PDF NULL;
