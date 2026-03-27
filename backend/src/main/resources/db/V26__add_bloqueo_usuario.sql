-- V26: Seguridad — bloqueo de cuenta por intentos fallidos de login
-- Aplicar manualmente en Oracle SQL Developer antes de arrancar el backend
ALTER TABLE SISCONV.TBL_USUARIO ADD (
    INTENTOS_FALLIDOS NUMBER(3)  DEFAULT 0 NOT NULL,
    BLOQUEADO_HASTA   TIMESTAMP
);
