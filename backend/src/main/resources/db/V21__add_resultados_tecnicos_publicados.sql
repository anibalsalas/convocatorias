-- V21: Flag de publicación explícita de resultados E26 Evaluación Técnica
-- Se activa SOLO cuando el ROL COMITÉ presiona "Publicar Resultados E26".
-- No se activa automáticamente al registrar la evaluación.

ALTER TABLE SISCONV.TBL_CONVOCATORIA
  ADD (RESULTADOS_TECNICOS_PUBLICADOS NUMBER(1) DEFAULT 0 NOT NULL
       CONSTRAINT CK_CONV_RESTEC_PUB CHECK (RESULTADOS_TECNICOS_PUBLICADOS IN (0,1)));
