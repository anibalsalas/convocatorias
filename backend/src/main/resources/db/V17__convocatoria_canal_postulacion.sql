-- V17: Convocatoria — agregar campos de canal de postulación, correo, formato de expediente
--      y dependencia encargada del proceso.
-- Propósito: Completar la sección "Canal de Postulación" en las Bases PDF (E16 CU-11)
--            y parametrizar la dependencia encargada que estaba hardcodeada.
-- Tablas afectadas: TBL_CONVOCATORIA
-- Rollback: Ver sección al final del script.
-- Todos los campos son NULLABLE (compatibilidad con convocatorias ya existentes).

-- 1. Dependencia encargada del proceso de contratación
--    Reemplaza el valor hardcodeado "Oficina General de Administración." del BasesPdfGenerator.
ALTER TABLE TBL_CONVOCATORIA ADD DEPENDENCIA_ENCARGADA_PROCESO VARCHAR2(300);

COMMENT ON COLUMN TBL_CONVOCATORIA.DEPENDENCIA_ENCARGADA_PROCESO IS
    'Dependencia responsable del proceso CAS. Default: Oficina General de Administración';

-- 2. Canal de postulación — medio oficial de envío del expediente
ALTER TABLE TBL_CONVOCATORIA ADD CANAL_POSTULACION VARCHAR2(30);

ALTER TABLE TBL_CONVOCATORIA ADD CONSTRAINT CK_CONV_CANAL_POSTULACION
    CHECK (CANAL_POSTULACION IN ('CORREO', 'PRESENCIAL', 'VIRTUAL', 'MIXTO') OR CANAL_POSTULACION IS NULL);

COMMENT ON COLUMN TBL_CONVOCATORIA.CANAL_POSTULACION IS
    'Canal oficial de postulación: CORREO, PRESENCIAL, VIRTUAL, MIXTO';

-- 3. Correo electrónico institucional para recepción de expedientes
ALTER TABLE TBL_CONVOCATORIA ADD CORREO_POSTULACION VARCHAR2(200);

COMMENT ON COLUMN TBL_CONVOCATORIA.CORREO_POSTULACION IS
    'Correo electrónico para recibir expedientes. Ej: cas@acffaa.gob.pe';

-- 4. Tamaño máximo del expediente en megabytes
ALTER TABLE TBL_CONVOCATORIA ADD MAX_TAMANO_ARCHIVO_MB NUMBER(5, 0);

COMMENT ON COLUMN TBL_CONVOCATORIA.MAX_TAMANO_ARCHIVO_MB IS
    'Tamaño máximo permitido del archivo/expediente en MB para envío por correo';

-- 5. Formato / nomenclatura del nombre del archivo a enviar
--    Ejemplo: "APELLIDO_PATERNO_NOMBRES_DNI_CAS-001-2026.pdf"
ALTER TABLE TBL_CONVOCATORIA ADD FORMATO_NOMBRE_ARCHIVO VARCHAR2(500);

COMMENT ON COLUMN TBL_CONVOCATORIA.FORMATO_NOMBRE_ARCHIVO IS
    'Plantilla de nomenclatura del expediente. Ej: APELLIDOS_NOMBRES_DNI_[NUMERO_CONV].pdf';

-- 6. Formato del asunto del correo de postulación
--    Ejemplo: "POSTULACIÓN [CAS-001-2026] - [APELLIDOS Y NOMBRES] - [DNI]"
ALTER TABLE TBL_CONVOCATORIA ADD FORMATO_ASUNTO_POSTULACION VARCHAR2(300);

COMMENT ON COLUMN TBL_CONVOCATORIA.FORMATO_ASUNTO_POSTULACION IS
    'Formato del asunto del correo del postulante. Ej: POSTULACIÓN [NUMERO_CONV] - [APELLIDOS] - [DNI]';

-- ── ROLLBACK (ejecutar solo si se necesita revertir esta migración) ──
-- ALTER TABLE TBL_CONVOCATORIA DROP CONSTRAINT CK_CONV_CANAL_POSTULACION;
-- ALTER TABLE TBL_CONVOCATORIA DROP COLUMN FORMATO_ASUNTO_POSTULACION;
-- ALTER TABLE TBL_CONVOCATORIA DROP COLUMN FORMATO_NOMBRE_ARCHIVO;
-- ALTER TABLE TBL_CONVOCATORIA DROP COLUMN MAX_TAMANO_ARCHIVO_MB;
-- ALTER TABLE TBL_CONVOCATORIA DROP COLUMN CORREO_POSTULACION;
-- ALTER TABLE TBL_CONVOCATORIA DROP COLUMN CANAL_POSTULACION;
-- ALTER TABLE TBL_CONVOCATORIA DROP COLUMN DEPENDENCIA_ENCARGADA_PROCESO;
