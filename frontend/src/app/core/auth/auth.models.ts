export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterPostulanteRequest {
  tipoDocumento: 'DNI' | 'CE';
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  password: string;
  passwordConfirm: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  username: string;
  nombreCompleto: string;
  roles: string[];
}

export interface UserSession {
  username: string;
  nombreCompleto: string;
  roles: string[];
  accessToken: string;
  refreshToken: string;
}

export type AppRole = 'ROLE_ADMIN' | 'ROLE_ORH' | 'ROLE_OPP' | 'ROLE_AREA_SOLICITANTE' | 'ROLE_COMITE' | 'ROLE_POSTULANTE';

export const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: 'Administrador',
  ROLE_ORH: 'Oficina de Recursos Humanos',
  ROLE_OPP: 'Oficina de Planeamiento',
  ROLE_AREA_SOLICITANTE: 'Área Solicitante',
  ROLE_COMITE: 'Comité de Selección',
  ROLE_POSTULANTE: 'Postulante',
};
