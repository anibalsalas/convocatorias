export interface PostulanteExperiencia {
    idExperiencia: number;
    tipoExperiencia: string;
    tipoSector: string;
    institucion: string;
    puesto: string;
    nivel: string;
    funciones: string;
    fechaInicio: string;
    fechaFin: string;
    nombreArchivo: string;
    tamanoKb: number | null;
    estado: string;
  }