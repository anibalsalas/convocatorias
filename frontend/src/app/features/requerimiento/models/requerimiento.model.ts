/**
 * E2 — Interfaces para Requerimiento (E6-E8).
 * Incluye datos heredados requeridos por la pantalla E9 Nueva Convocatoria.
 */

export interface RequerimientoRequest {
  idPerfilPuesto: number;
  idAreaSolicitante: number;
  justificacion: string;
  cantidadPuestos: number;
}

export interface VerificarPresupuestoRequest {
  existePresupuesto: boolean;
  certificacionPresupuestal?: string;
  numeroSiaf?: string;
  observaciones?: string;
}

export interface CriterioItem {
  criterio: string;
  puntajeMaximo: number;
  peso: number;
}

export interface ConfigurarReglasRequest {
  pesoEvalCurricular: number;
  pesoEvalTecnica: number;
  pesoEntrevista: number;
  umbralCurricular: number;
  umbralTecnica: number;
  umbralEntrevista: number;
  /** Opcional; la pantalla Motor RF-14 envía []. */
  criteriosCurriculares?: CriterioItem[];
}

export interface CondicionPerfilResumen {
  remuneracionMensual?: number | null;
  lugarPrestacion?: string | null;
  duracionContrato?: string | null;
}

export interface PerfilResumen {
  idPerfil: number;
  denominacion: string;
  nombrePuesto?: string | null;
  unidadOrganica?: string | null;
  condicion?: CondicionPerfilResumen | null;
}

export interface MotorReglasResumen {
  pesoEvalCurricular: number;
  pesoEvalTecnica: number;
  pesoEntrevista: number;
  totalPesos: number;
  criteriosRegistrados: number;
}

export interface RequerimientoResponse {
  idRequerimiento: number;
  numeroRequerimiento: string;
  perfil: PerfilResumen;
  idAreaSolicitante: number;
  justificacion: string;
  cantidadPuestos: number;
  idUsuarioSolicitante: number;
  estado: string;
  tienePresupuesto: boolean;
  certificacionPresupuestal: string;
  numeroSiaf: string;
  observacionPresupuestal: string;
  fechaCertPresupuestal: string;
  motorReglas?: MotorReglasResumen | null;
  tieneConvocatoria?: boolean | null;
  mensaje: string;
  fechaSolicitud: string;
  usuarioCreacion: string;
  fechaCreacion: string;
  fechaModificacion: string;
}
