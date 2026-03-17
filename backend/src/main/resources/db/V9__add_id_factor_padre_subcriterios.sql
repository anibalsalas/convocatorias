-- V9: Agregar soporte para subcriterios (jerarquía fase → subcriterios)
-- Self-reference: ID_FACTOR_PADRE apunta al factor padre (fase principal)
-- NULL = fase principal (Evaluación curricular, Evaluación técnica, Entrevista Personal)
-- NOT NULL = subcriterio bajo una fase (ej. Formación Académica, Experiencia, Cursos)

ALTER TABLE TBL_FACTOR_EVALUACION ADD (
  ID_FACTOR_PADRE NUMBER(19)
);

ALTER TABLE TBL_FACTOR_EVALUACION ADD CONSTRAINT FK_FACTOR_PADRE
  FOREIGN KEY (ID_FACTOR_PADRE) REFERENCES TBL_FACTOR_EVALUACION (ID_FACTOR)
  ON DELETE CASCADE;

COMMENT ON COLUMN TBL_FACTOR_EVALUACION.ID_FACTOR_PADRE IS
  'FK al factor padre. NULL = fase principal. NOT NULL = subcriterio de la fase.';
