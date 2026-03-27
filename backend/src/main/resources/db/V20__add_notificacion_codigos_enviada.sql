-- V20: Flag para indicar que ORH ya notificó al COMITÉ que los códigos anónimos están asignados (E25→E26).
-- Se activa SOLO cuando ORH presiona "Notificar al Comité" en E25.
-- No se activa automáticamente al asignar los códigos.

ALTER TABLE TBL_CONVOCATORIA
  ADD (NOTIFICACION_CODIGOS_ENVIADA NUMBER(1) DEFAULT 0 NOT NULL
       CONSTRAINT CK_CONV_NOTIF_COD CHECK (NOTIFICACION_CODIGOS_ENVIADA IN (0,1)));
