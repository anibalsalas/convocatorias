-- V22: Flag de publicación de resultados de Entrevista Personal (E27)
-- Mismo patrón que V19 (curricular) y V21 (técnica)
ALTER TABLE TBL_CONVOCATORIA ADD (
    ENTREVISTA_PUBLICADA NUMBER(1) DEFAULT 0 NOT NULL
);
