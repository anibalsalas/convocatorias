-- V29: Los usernames de postulantes deben ser solo el número de documento.
-- Antes: "DNI44595846" / "CE12345678"  →  Después: "44595846" / "12345678"
-- Solo afecta usuarios vinculados a TBL_POSTULANTE (no toca ORH/COMITÉ/ADMIN).
UPDATE TBL_USUARIO u
SET u.USERNAME = REGEXP_REPLACE(u.USERNAME, '^(DNI|CE)', '')
WHERE REGEXP_LIKE(u.USERNAME, '^(DNI|CE)[0-9A-Z]+$')
  AND EXISTS (
      SELECT 1 FROM TBL_POSTULANTE p WHERE p.ID_USUARIO = u.ID_USUARIO
  );

COMMIT;
