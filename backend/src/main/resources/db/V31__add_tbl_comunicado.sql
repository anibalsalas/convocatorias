-- ============================================================
-- V31 — TBL_COMUNICADO — Comunicados oficiales por convocatoria
-- DS 083-2019-PCM Art. 10 — Aclaraciones, fe de erratas,
-- ampliaciones de plazo. Publicados por ORH en cualquier momento.
-- ============================================================

CREATE SEQUENCE SEQ_COMUNICADO
  START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

CREATE TABLE TBL_COMUNICADO (
  ID_COMUNICADO      NUMBER DEFAULT SEQ_COMUNICADO.NEXTVAL NOT NULL,
  ID_CONVOCATORIA    NUMBER                                NOT NULL,
  TITULO             VARCHAR2(200)                         NOT NULL,
  DESCRIPCION        CLOB                                  NOT NULL,
  FECHA_PUBLICACION  TIMESTAMP DEFAULT SYSTIMESTAMP        NOT NULL,
  USUARIO_CREACION   VARCHAR2(100)                         NOT NULL,
  FECHA_CREACION     TIMESTAMP DEFAULT SYSTIMESTAMP        NOT NULL,
  CONSTRAINT PK_COMUNICADO    PRIMARY KEY (ID_COMUNICADO),
  CONSTRAINT FK_COM_CONV      FOREIGN KEY (ID_CONVOCATORIA)
                              REFERENCES TBL_CONVOCATORIA(ID_CONVOCATORIA)
);

CREATE INDEX IDX_COMUNICADO_CONV ON TBL_COMUNICADO(ID_CONVOCATORIA);

COMMIT;
