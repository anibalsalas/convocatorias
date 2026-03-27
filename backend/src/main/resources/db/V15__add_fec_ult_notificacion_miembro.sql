-- V15 — Auditoría de notificación individual por correo (PKG-06)
-- Registra el timestamp de la última notificación enviada al miembro del comité.
ALTER TABLE TBL_MIEMBRO_COMITE ADD FEC_ULT_NOTIFICACION TIMESTAMP;
