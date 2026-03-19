/**
 * E3 — M02 Convocatoria (PKG-02)
 * Modelos frontend alineados al backend E9–E16 + CRUD miembros.
 */

export interface ConvocatoriaRequest {
  idRequerimiento: number;
  numeroConvocatoria?: string | null;
  descripcion: string;
  objetoContratacion?: string | null;
  fechaPublicacion?: string | null;
  fechaIniPostulacion?: string | null;
  fechaFinPostulacion?: string | null;
  fechaEvaluacion?: string | null;
  fechaResultado?: string | null;
}

export interface ActividadCronogramaItem {
  etapa: string;
  actividad: string;
  fechaInicio: string;
  fechaFin: string;
  responsable?: string | null;
  lugar?: string | null;
  orden?: number | null;
  areaResp1?: string | null;
  areaResp2?: string | null;
  areaResp3?: string | null;
}

export interface CronogramaRequest {
  actividades: ActividadCronogramaItem[];
}

export interface MiembroComiteItem {
  idUsuario?: number | null;
  nombresCompletos: string;
  cargo?: string | null;
  rolComite: string;
  esTitular?: boolean | null;
  email?: string | null;
}

export interface ComiteRequest {
  numeroResolucion: string;
  fechaDesignacion: string;
  miembros: MiembroComiteItem[];
}

/** Request para CRUD individual de miembro */
export interface MiembroComiteRequest {
  nombresCompletos: string;
  cargo?: string | null;
  rolComite: string;
  esTitular?: boolean | null;
  email?: string | null;
}

export interface FactorEvaluacionItem {
  etapaEvaluacion: string;
  criterio: string;
  puntajeMaximo: number;
  puntajeMinimo?: number | null;
  pesoCriterio: number;
  orden?: number | null;
  descripcion?: string | null;
}

/** Respuesta de factor individual — GET /factores, CRUD */
export interface FactorDetalleResponse {
  idFactor: number;
  idConvocatoria: number;
  idFactorPadre?: number | null;
  etapaEvaluacion: string;
  criterio: string;
  puntajeMaximo: number;
  puntajeMinimo?: number | null;
  pesoCriterio: number;
  orden?: number | null;
  descripcion?: string | null;
  estado?: string | null;
  subcriterios?: FactorDetalleResponse[];
}

/** Request para CRUD individual de factor */
export interface FactorFactorRequest {
  etapaEvaluacion: string;
  criterio: string;
  idFactorPadre?: number | null;
  puntajeMaximo: number;
  puntajeMinimo?: number | null;
  pesoCriterio: number;
  orden?: number | null;
  descripcion?: string | null;
}

export interface FactorEvaluacionRequest {
  factores: FactorEvaluacionItem[];
}

export interface AprobarConvocatoriaRequest {
  aprobada: boolean;
  linkTalentoPeru?: string | null;
  linkPortalAcffaa?: string | null;
}

export interface RequerimientoResumen {
  idRequerimiento: number;
  numeroRequerimiento: string;
}

export interface ConvocatoriaResponse {
  idConvocatoria: number;
  numeroConvocatoria: string;
  descripcion: string;
  objetoContratacion?: string | null;
  estado: string;
  pesoEvalCurricular?: number | null;
  pesoEvalTecnica?: number | null;
  pesoEntrevista?: number | null;
  fechaPublicacion?: string | null;
  fechaIniPostulacion?: string | null;
  fechaFinPostulacion?: string | null;
  fechaEvaluacion?: string | null;
  fechaResultado?: string | null;
  linkTalentoPeru?: string | null;
  linkPortalAcffaa?: string | null;
  fechaCreacion?: string | null;
  usuarioCreacion?: string | null;
  requerimiento?: RequerimientoResumen | null;
  /** Cronograma con 5 actividades y reglas válidas */
  cronogramaConformado?: boolean | null;
  /** Factores registrados con peso total 100% */
  tieneFactoresPeso100?: boolean | null;
  /** Acta de instalación existente y firmada */
  tieneActaFirmada?: boolean | null;
  /** Bases generables: cronograma + factores 100% */
  basesGeneradas?: boolean | null;
  mensaje?: string | null;
}

export interface ActividadCronogramaResponse {
  idCronograma: number;
  etapa: string;
  actividad: string;
  fechaInicio: string;
  fechaFin: string;
  responsable?: string | null;
  lugar?: string | null;
  orden?: number | null;
  areaResp1?: string | null;
  areaResp2?: string | null;
  areaResp3?: string | null;
}

export interface CronogramaResponse {
  idConvocatoria: number;
  actividadesRegistradas: number;
  mensaje?: string | null;
}

export interface ComiteResponse {
  idComite: number;
  idConvocatoria: number;
  miembrosRegistrados: number;
  notificacionesEnviadas: number;
  mensaje?: string | null;
}

/** GET /convocatorias/{id}/comite */
export interface MiembroDetalleItem {
  idMiembroComite: number;
  nombresCompletos: string;
  cargo?: string | null;
  rolComite: string;
  esTitular: boolean;
  estado: string;
  email?: string | null;
  /** ISO-8601 timestamp de última notificación. Null si nunca fue notificado. */
  fechaUltNotificacion?: string | null;
}

export interface ComiteDetalleResponse {
  idComite: number;
  idConvocatoria: number;
  numeroConvocatoria: string;
  numeroResolucion: string;
  fechaDesignacion?: string | null;
  estado: string;
  miembros: MiembroDetalleItem[];
}

export interface FactorEvaluacionResponse {
  idConvocatoria: number;
  factoresRegistrados: number;
  mensaje?: string | null;
}

export interface ActaResponse {
  idActa: number;
  tipoActa: string;
  numeroActa: string;
  fechaActa?: string | null;
  rutaArchivoPdf?: string | null;
  estado: string;
  firmada?: boolean | null;
  fechaCargaFirma?: string | null;
  mensaje?: string | null;
}

export interface ConvocatoriaFiltros {
  estado?: string;
}
