/**
 * Modelo de ubigeo Perú — departamento, provincia, distrito
 */
export interface UbigeoDistrito {
  codigo: string;
  nombre: string;
}

export interface UbigeoProvincia {
  codigo: string;
  nombre: string;
  distritos: UbigeoDistrito[];
}

export interface UbigeoDepartamento {
  codigo: string;
  nombre: string;
  provincias: UbigeoProvincia[];
}
