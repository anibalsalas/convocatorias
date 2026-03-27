-- V25: Ampliar CK_NOTIF_ESTADO para soportar patrón async Phase1/Phase2 (E31)
-- El diseño original solo contemplaba 'ENVIADA' (síncrono).
-- El código evolucionó a async: PENDIENTE → ENVIADO | FALLIDO.
-- La constraint vieja rechazaba 'PENDIENTE' con ORA-02290.
ALTER TABLE TBL_NOTIFICACION DROP CONSTRAINT CK_NOTIF_ESTADO;

ALTER TABLE TBL_NOTIFICACION ADD CONSTRAINT CK_NOTIF_ESTADO
    CHECK (ESTADO IN ('ENVIADA','PENDIENTE','ENVIADO','FALLIDO','LEIDA','ELIMINADA'));

COMMIT;
