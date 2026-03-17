export interface NotificacionResponse {
    idNotificacion: number;
    tipoNotificacion: string;
    asunto: string;
    contenido: string;
    estado: string;
    estadoProceso?: string | null;
    fechaCreacion: string;
  }