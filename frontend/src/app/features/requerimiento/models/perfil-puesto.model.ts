export interface PerfilFormacionAcademicaRequest {
  gradoAcademico: string;
  especialidad: string;
  requiereColegiatura: boolean;
  requiereHabilitacionProfesional: boolean;
  orden: number;
}

export interface PerfilConocimientoRequest {
  tipoConocimiento: string;
  descripcion: string;
  horas?: number | null;
  nivelDominio: string;
  orden: number;
}

export interface PerfilExperienciaRequest {
  tipoExperiencia: string;
  cantidad: number;
  unidadTiempo: string;
  nivelMinimoPuesto: string;
  detalle: string;
  orden: number;
}

export interface RequisitoPuestoRequest {
  idTipoRequisito: number;
  descripcion: string;
  esObligatorio: string;
  orden: number;
}

export interface FuncionPuestoRequest {
  descripcionFuncion: string;
  orden: number;
}

export interface CondicionPuestoRequest {
  remuneracionMensual: number;
  duracionContrato: string;
  lugarPrestacion: string;
  jornadaSemanal: number;
  otrasCondiciones?: string;
}

export interface PerfilRegistroContextResponse {
  idAreaSolicitante: number;
  unidadOrganica: string;
  username: string;
}

export interface NivelPuestoResponse {
  idNivelPuesto: number;
  codigo: string;
  descripcion: string;
  orden?: number;
}

export interface PerfilPuestoRequest {
  nombrePuesto?: string;
  denominacionPuesto: string;
  unidadOrganica: string;
  idAreaSolicitante: number;
  idNivelPuesto?: number | null;
  idNivelFormacion?: number | null;
  dependenciaJerarquicaLineal?: string;
  dependenciaFuncional?: string;
  puestosCargo?: number | null;
  experienciaGeneral?: string;
  experienciaEspecifica?: string;
  habilidades?: string;
  formacionAcademica?: string;
  cursosEspecializacion?: string;
  conocimientosPuesto?: string;
  misionPuesto: string;
  cantidadPuestos: number;
  formacionesAcademicas?: PerfilFormacionAcademicaRequest[];
  conocimientos?: PerfilConocimientoRequest[];
  experiencias?: PerfilExperienciaRequest[];
  requisitos?: RequisitoPuestoRequest[];
  funciones?: FuncionPuestoRequest[];
  condicion?: CondicionPuestoRequest;
}

export interface ValidarPerfilRequest {
  cumpleMpp: boolean;
  observaciones?: string;
}

export interface AprobarPerfilRequest {
  aprobado: boolean;
  observaciones?: string;
}

export interface PerfilFormacionAcademicaResponse {
  idPerfilFormacion: number;
  gradoAcademico: string;
  especialidad: string;
  requiereColegiatura: boolean;
  requiereHabilitacionProfesional: boolean;
  orden: number;
}

export interface PerfilConocimientoResponse {
  idPerfilConocimiento: number;
  tipoConocimiento: string;
  descripcion: string;
  horas?: number | null;
  nivelDominio: string;
  orden: number;
}

export interface PerfilExperienciaResponse {
  idPerfilExperiencia: number;
  tipoExperiencia: string;
  cantidad: number;
  unidadTiempo: string;
  nivelMinimoPuesto: string;
  detalle: string;
  orden: number;
}

export interface RequisitoPuestoResponse {
  idRequisitoPerfil: number;
  idTipoRequisito: number;
  descripcion: string;
  esObligatorio: string;
  orden: number;
}

export interface FuncionPuestoResponse {
  idFuncionPuesto: number;
  descripcionFuncion: string;
  orden: number;
}

export interface CondicionPuestoResponse {
  idCondicionPuesto: number;
  remuneracionMensual: number;
  duracionContrato: string;
  lugarPrestacion: string;
  jornadaSemanal: number;
  otrasCondiciones: string;
}

export interface PerfilPuestoResponse {
  idPerfilPuesto: number;
  nombrePuesto?: string;
  denominacionPuesto: string;
  unidadOrganica: string;
  idAreaSolicitante: number;
  idNivelPuesto?: number | null;
  idNivelFormacion?: number | null;
  dependenciaJerarquicaLineal?: string;
  dependenciaFuncional?: string;
  puestosCargo?: number | null;
  experienciaGeneral?: string;
  experienciaEspecifica?: string;
  habilidades?: string;
  formacionAcademica?: string;
  cursosEspecializacion?: string;
  conocimientosPuesto?: string;
  misionPuesto: string;
  cantidadPuestos: number;
  estado: string;
  validadoContraMpp: boolean;
  observaciones: string;
  fechaValidacion: string;
  usuarioValidacion: string;
  fechaAprobacion: string;
  usuarioAprobacion: string;
  usuarioCreacion: string;
  fechaCreacion: string;
  fechaModificacion: string;
  tieneRequerimientoAsociado?: boolean;
  estadoRequerimientoAsociado?: string | null;
  formacionesAcademicas: PerfilFormacionAcademicaResponse[];
  conocimientos: PerfilConocimientoResponse[];
  experiencias: PerfilExperienciaResponse[];
  requisitos: RequisitoPuestoResponse[];
  funciones: FuncionPuestoResponse[];
  condicion: CondicionPuestoResponse;
}
