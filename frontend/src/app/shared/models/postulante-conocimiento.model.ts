export interface PostulanteConocimiento {
    idConocimiento: number;
    tipoConocimiento: string;
    descripcion: string;
    nivel: string;
    tipoOfimatica?: string | null;
    institucion: string | null;
    horas: number | null;
    fechaInicio: string | null;
    fechaFin: string | null;
    nombreArchivo: string;
    tamanoKb: number | null;
    estado: string;
  }