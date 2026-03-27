-- V28: Flag de notificación ORH tras cargar Acta firmada (E14)
-- COMITÉ presiona "Notificar a ORH" → ORH ve aviso en lista de convocatorias.
-- Mismo patrón que NOTIFICACION_ENTREVISTA_ENVIADA (V23).
ALTER TABLE TBL_CONVOCATORIA ADD (
    NOTIFICACION_ACTA_ENVIADA NUMBER(1) DEFAULT 0 NOT NULL
);
