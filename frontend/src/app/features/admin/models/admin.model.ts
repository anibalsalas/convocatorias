// M10 — Administración: Usuarios, Áreas, Log de Transparencia

export interface UsuarioAdmin {
  idUsuario: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  idArea: number | null;
  estado: string;
  ultimoAcceso: string | null;
  fechaCreacion: string | null;
  roles: string[];
}

export interface UsuarioRequest {
  username: string;
  password: string;
  nombres: string;
  apellidos: string;
  email: string;
  idArea: number | null;
  rolesCodigosRol: string[];
}

export interface UsuarioUpdateRequest {
  nombres: string;
  apellidos: string;
  email: string;
  idArea: number | null;
  rolesCodigosRol: string[];
}

export interface AreaOrganizacional {
  idArea: number;
  codigoArea: string;
  nombreArea: string;
  sigla: string | null;
  tipoArea: string | null;
  responsable: string | null;
  estado: string;
}

export interface AreaRequest {
  codigoArea: string;
  nombreArea: string;
  sigla: string | null;
  tipoArea: string | null;
  responsable: string | null;
  estado?: string | null;
}

export interface LogTransparencia {
  idLog: number;
  entidad: string;
  idEntidad: number;
  accion: string;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  usuarioAccion: string | null;
  ipOrigen: string | null;
  fechaAccion: string;
  sustento: string | null;
  datosAdicionales: string | null;
}
