-- V14 — Agregar columna EMAIL_MIEMBRO a TBL_MIEMBRO_COMITE
-- Permite notificación individual al miembro del comité de selección.
ALTER TABLE TBL_MIEMBRO_COMITE ADD EMAIL_MIEMBRO VARCHAR2(100);
