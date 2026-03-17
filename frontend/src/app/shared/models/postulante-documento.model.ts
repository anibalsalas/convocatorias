export interface PostulanteDocumento {
    idDocumento: number;
    tipoDocumento: string;
    nombreArchivo: string;
    tamanoKb: number | null;
    estado: string;
  }