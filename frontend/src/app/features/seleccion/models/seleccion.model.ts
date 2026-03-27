/**
 * seleccion.model.ts — M03 Selección (E17–E31)
 *
 * DDL source of truth (immutable):
 *  - TBL_CONVOCATORIA: PESO_EVAL_CURRICULAR, PESO_EVAL_TECNICA, PESO_ENTREVISTA
 *  - TBL_REGLA_MOTOR:  UMBRAL_MINIMO per ETAPA_EVALUACION (CURRICULAR / TECNICA / ENTREVISTA)
 *  - TBL_POSTULACION:  VERIFICACION_RNSSC / VERIFICACION_REGIPREC — strings, not booleans
 *
 * Regla de negocio E24/E26:
 *  Backend SeleccionService hardcodea new BigDecimal("60.00") como umbral.
 *  El umbral real viene de TBL_REGLA_MOTOR.UMBRAL_MINIMO (50 en datos reales).
 *  Bug de backend documentado — frontend muestra umbralAplicado del response.
 */

// ── Convocatoria en contexto Selección ───────────────────────────────────────

export interface ConvocatoriaSeleccionItem {
  idConvocatoria: number;
  numeroConvocatoria: string;
  descripcion: string;
  objetoContratacion: string;
  estado: string;
  anio: number;
  unidadOrganica?: string | null;
  nombrePuesto?: string | null;
  fechaPublicacion?: string | null;
  postulantesRegistrados?: number | null;
  postulantesVerificados?: number | null;
  postulantesAptos?: number | null;
  resultadosCurricularPublicados?: boolean | null;
  notificacionCodigosEnviada?: boolean | null;
  resultadosTecnicosPublicados?: boolean | null;
  entrevistaPublicada?: boolean | null;
  notificacionEntrevistaEnviada?: boolean | null;
  bonificacionesCalculadas?: boolean | null;
  // Pesos heredados de Motor RF-14 — TBL_CONVOCATORIA columnas
  pesoEvalCurricular?: number | null;
  pesoEvalTecnica?: number | null;
  pesoEntrevista?: number | null;
}

// ── Postulante anidado (PostulanteResponse.java) ──────────────────────────────

export interface PostulanteInfo {
  idPostulante?: number;
  tipoDocumento?: string;
  numeroDocumento: string;
  nombreCompleto: string;
  email?: string;
  genero?: string;
  estado?: string;
  esLicenciadoFfaa?: boolean | null;
  esPersonaDiscap?: boolean | null;
  esDeportistaDest?: boolean | null;
}

// ── Postulación (PostulacionResponse.java) ────────────────────────────────────

export interface PostulacionSeleccion {
  idPostulacion: number;
  idConvocatoria: number;
  idPerfilPuesto?: number;
  numeroConvocatoria?: string;
  nombrePuesto?: string;
  postulante: PostulanteInfo;
  estado: string;
  codigoAnonimo?: string | null;
  /** Flags D.L.1451 — string exacto: "SIN_SANCIONES" | "CON_SANCIONES" | null */
  verificacionRnssc?: string | null;
  verificacionRegiprec?: string | null;
  /** Observación libre del evaluador ORH al registrar DL1451 — trazabilidad SERVIR */
  observacionDl?: string | null;
  puntajeCurricular?: number | null;
  puntajeTecnica?: number | null;
  puntajeEntrevista?: number | null;
  puntajeBonificacion?: number | null;
  puntajeTotal?: number | null;
  ordenMerito?: number | null;
  resultado?: string | null;
  fechaPostulacion?: string | null;
  estadoExpediente?: string | null;
  mensaje?: string;
}

// ── Factores de evaluación ───────────────────────────────────────────────────

export interface FactorDetalle {
  idFactor: number;
  idFactorPadre?: number | null;
  etapaEvaluacion: string;
  criterio: string;
  puntajeMaximo: number;
  puntajeMinimo: number;
  pesoCriterio?: number;
  orden?: number;
  descripcion?: string;
  subcriterios?: FactorDetalle[];
}

// ── Comité ───────────────────────────────────────────────────────────────────

export interface ComiteDetalle {
  idComite: number;
  numeroResolucion?: string;
  miembros: MiembroComiteItem[];
}

export interface MiembroComiteItem {
  idMiembroComite: number;
  nombresCompletos: string;
  cargo?: string;
  rolComite?: string;
}

// ── Requests ─────────────────────────────────────────────────────────────────

export interface FactorPuntaje {
  idFactor: number;
  puntaje: number;
  observacion?: string;
}

export interface EvalCurricularItem {
  idPostulacion: number;
  factores: FactorPuntaje[];
}

export interface EvalCurricularRequest {
  evaluaciones: EvalCurricularItem[];
}

export interface EvalTecnicaItem {
  codigoAnonimo: string;
  puntaje: number;
  observacion?: string;
}

export interface EvalTecnicaRequest {
  evaluaciones: EvalTecnicaItem[];
}

export interface MiembroPuntaje {
  idMiembroComite: number;
  puntaje: number;
  observacion?: string;
}

export interface EntrevistaItem {
  idPostulacion: number;
  puntajesMiembros: MiembroPuntaje[];
}

export interface EntrevistaRequest {
  entrevistas: EntrevistaItem[];
}

/**
 * D.L.1451 — strings exactos que espera el backend Java.
 * VerificacionDl1451Request.java: private String verificacionRnssc
 */
export interface RollbackAdminRequest {
  estadoDestino: 'REGISTRADO';
  sustento: string;
}

export interface VerificacionDl1451Request {
  verificacionRnssc: 'SIN_SANCIONES' | 'CON_SANCIONES';
  verificacionRegiprec: 'SIN_SANCIONES' | 'CON_SANCIONES';
  observacion?: string;
}

export interface TachaRequest {
  idPostulacion: number;
  motivo: string;
  descripcion: string;
}

export interface ResolverTachaRequest {
  decision: 'FUNDADA' | 'INFUNDADA';
  motivoResolucion: string;
}

export interface TachaResponse {
  idTacha: number;
  idPostulacion: number;
  idConvocatoria: number;
  nombrePostulante: string;
  motivo: string;
  descripcion: string;
  estado: string;
  decision?: string | null;
  motivoResolucion?: string | null;
  fechaRegistro: string;
  fechaResolucion?: string | null;
}

export interface FiltroItem {
  idPostulacion: number;
  nombrePostulante: string;
  cumpleFormacion: boolean;
  cumpleExperiencia: boolean;
  cumpleConocimientos: boolean;
  cumpleTotal: boolean;
  estadoAnterior: string;
  estadoNuevo: string;
  observacion?: string;
}

export interface FiltroRequisitosResponse {
  idConvocatoria: number;
  totalPostulantes: number;
  totalInscritos: number;
  totalNoAptos: number;
  resultados: FiltroItem[];
  mensaje: string;
}

// ── Responses de evaluación ───────────────────────────────────────────────────

export interface EvalCurricularResultado {
  idPostulacion: number;
  nombrePostulante: string;
  puntajeTotal: number;
  estado: string;
}

export interface EvalCurricularResponse {
  idConvocatoria: number;
  totalEvaluados: number;
  totalAptos: number;
  totalNoAptos: number;
  resultados: EvalCurricularResultado[];
  mensaje: string;
  /** umbral aplicado por el backend (hardcodeado en 60 actualmente — bug backend) */
  umbralAplicado?: number | null;
}

export interface EvalTecnicaResultado {
  codigoAnonimo: string;
  puntaje: number;
  estado: string;
}

export interface EvalTecnicaResponse {
  idConvocatoria: number;
  totalEvaluados: number;
  resultados: EvalTecnicaResultado[];
  mensaje: string;
  /** umbral aplicado por el backend para eval técnica */
  umbralAplicado?: number | null;
}

export interface EntrevistaResultado {
  idPostulacion: number;
  nombrePostulante: string;
  puntajePromedio: number;
  quorumAlcanzado: boolean;
}

export interface EntrevistaResponse {
  idConvocatoria: number;
  totalEntrevistados: number;
  quorumGlobal: boolean;
  resultados: EntrevistaResultado[];
  mensaje: string;
}

export interface BonifItem {
  idPostulacion: number;
  nombrePostulante: string;
  tipoBonificacion: string;
  porcentaje: number;
  puntajeBase: number;
  puntajeAplicado: number;
  baseLegal: string;
}

export interface BonificacionResponse {
  idConvocatoria: number;
  totalBonificados: number;
  bonificaciones: BonifItem[];
  mensaje: string;
}

export interface MeritoItem {
  ordenMerito: number;
  idPostulacion: number;
  nombrePostulante: string;
  puntajeCurricular?: number;
  puntajeTecnica?: number;
  puntajeEntrevista?: number;
  puntajeBonificacion?: number;
  puntajeTotal?: number;
  resultado: string;
}

export interface CuadroMeritosResponse {
  idConvocatoria: number;
  numeroConvocatoria: string;
  totalPostulantes: number;
  cuadro: MeritoItem[];
  mensaje: string;
}

// ── Expediente virtual (documentos del postulante) ───────────────────────────

export interface ExpedienteItem {
  idExpediente: number;
  idPostulacion: number;
  tipoDocumento: string;
  nombreArchivo: string;
  tamanoKb: number;
  estado: string;
  verificado: boolean;
  fechaCarga: string;
}

export interface PublicarResultadosResponse {
  idConvocatoria: number;
  numeroConvocatoria: string;
  totalPostulantes: number;
  notificacionesEncoladas: number;
  cuadro: MeritoItem[];
  mensaje: string;
}

export interface NotificarCodigosResponse {
  idConvocatoria: number;
  numeroConvocatoria: string;
  cantidadAptos: number;
  mensaje: string;
}

/** Respuesta de POST /convocatorias/{id}/publicar-resultados-tecnica
 *  El backend retorna directamente el PDF como blob — esta interfaz es para errores/avisos. */
export interface PublicarTecnicaResponse {
  mensaje?: string;
}
