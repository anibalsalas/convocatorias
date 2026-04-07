export interface DeclaracionJuradaItem {
    tipoDeclaracion: string;
    aceptada: boolean;
  }
  
  
  
  export interface PostulacionItem {
    idPostulacion: number;
    idConvocatoria: number;
    idPerfilPuesto?: number | null;
    numeroConvocatoria: string | null;
    nombrePuesto: string | null;
    estado: string;
    estadoExpediente?: string | null;
    estadoPostulacionVisible?: string | null;
    fechaConfirmacionExpediente?: string | null;
    codigoAnonimo?: string | null;
    resultado?: string | null;
    fechaPostulacion: string | null;
    totalExpedientes: number | null;
    mensaje?: string | null;
    /** V34 — true si hay examen técnico virtual publicado y postulante es APTO */
    examenVirtualDisponible?: boolean | null;
    /** V34 — Estado del examen: null (no iniciado), EN_CURSO, FINALIZADO, EXPIRADO */
    estadoExamen?: string | null;
  }
  
  export interface UltimaPostulacionResumen {
    idPostulacion: number | null;
    idConvocatoria: number;
    numeroConvocatoria: string;
    nombrePuesto: string;
    estado: string;
    fechaPostulacion: string;
  }

  export interface ExpedienteItem {
    idExpediente: number;
    idPostulacion: number;
    tipoDocumento: string;
    nombreArchivo: string;
    hashSha256: string;
    verificado: boolean;
    fechaVerificacion: string | null;
    fechaCarga: string | null;
    tamanoKb: number | null;
    estado: string;
    mensaje?: string | null;
  }




  export interface RegistrarPostulacionRequest {
    idConvocatoria: number;
    tipoDocumento: string;
    numeroDocumento: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
    email: string | null;
    telefono: string | null;
    genero: string | null;
    fechaNacimiento: string | null;
    direccion: string | null;
    ubigeo: string | null;
    esLicenciadoFfaa?: boolean | null;
    esPersonaDiscap?: boolean | null;
    esDeportistaDest?: boolean | null;
    declaracionesJuradas: DeclaracionJuradaItem[];
  }
  
  export interface PostulacionResponse {
    idPostulacion: number;
    idConvocatoria: number;
    idPerfilPuesto?: number | null;
    estado: string;
    estadoExpediente?: string | null;
    estadoPostulacionVisible?: string | null;
    fechaConfirmacionExpediente?: string | null;
    codigoAnonimo?: string | null;
    fechaPostulacion?: string | null;
    mensaje?: string | null;
  }