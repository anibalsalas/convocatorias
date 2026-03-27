-- V13: Cronograma — agregar columnas de áreas responsables y ampliar CK_CRONO_ETAPA a 9 etapas.
-- Ejecutar manualmente en XEPDB1 (ACFFAA SISCONV).
-- Coherencia: Cronograma.java, CronogramaRequest.java, ActividadCronogramaResponse.java

-- 1. Nuevas columnas de áreas responsables
ALTER TABLE TBL_CRONOGRAMA ADD AREA_RESP_1 VARCHAR2(100);
ALTER TABLE TBL_CRONOGRAMA ADD AREA_RESP_2 VARCHAR2(100);
ALTER TABLE TBL_CRONOGRAMA ADD AREA_RESP_3 VARCHAR2(100);

-- 2. Reemplazar restricción de etapa con las 9 etapas del proceso CAS (D.S. 065-2011-PCM)
ALTER TABLE TBL_CRONOGRAMA DROP CONSTRAINT CK_CRONO_ETAPA;

ALTER TABLE TBL_CRONOGRAMA ADD CONSTRAINT CK_CRONO_ETAPA CHECK (
    ETAPA IN (
        'PUBLICACION',
        'POSTULACION',
        'EVAL_CURRICULAR',
        'RESULT_CURRICULAR',
        'EVAL_TECNICA',
        'RESULT_TECNICA',
        'ENTREVISTA',
        'RESULTADO',
        'SUSCRIPCION'
    )
);
