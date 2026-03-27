-- V19: Flag de publicación explícita de resultados E24 Evaluación Curricular
-- Se activa SOLO cuando el ROL COMITÉ presiona "Publicar Resultados E24".
-- No se activa automáticamente al registrar la evaluación.

ALTER TABLE TBL_CONVOCATORIA
  ADD (RESULTADOS_CURRICULAR_PUBLICADOS NUMBER(1) DEFAULT 0 NOT NULL
       CONSTRAINT CK_CONV_RESCURR_PUB CHECK (RESULTADOS_CURRICULAR_PUBLICADOS IN (0,1)));
