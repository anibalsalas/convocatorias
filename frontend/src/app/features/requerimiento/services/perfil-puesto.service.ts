import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { ApiResponse } from '@shared/models/api-response.model';
import { Page, PageRequest } from '@shared/models/pagination.model';
import {
  AprobarPerfilRequest,
  DenominacionPuestoResponse,
  NivelPuestoResponse,
  PerfilPuestoRequest,
  PerfilPuestoResponse,
  PerfilRegistroContextResponse,
  ValidarPerfilRequest,
} from '../models/perfil-puesto.model';

@Injectable({ providedIn: 'root' })
export class PerfilPuestoService {
  private readonly api = inject(ApiService);
  private readonly path = '/perfiles-puesto';

  crear(req: PerfilPuestoRequest): Observable<ApiResponse<PerfilPuestoResponse>> {
    return this.api.post<PerfilPuestoResponse>(this.path, req);
  }

  listar(
    page: PageRequest,
    filtros?: Record<string, string>,
  ): Observable<ApiResponse<Page<PerfilPuestoResponse>>> {
    return this.api.getPage<PerfilPuestoResponse>(this.path, page, filtros);
  }

  contarPendientesRequerimiento(): Observable<ApiResponse<number>> {
    return this.api.get<number>(`${this.path}/count-pendientes-requerimiento`);
  }

  contarPendientesValidarAprobar(): Observable<ApiResponse<number>> {
    return this.api.get<number>(`${this.path}/count-pendientes-validar-aprobar`);
  }

  obtener(id: number): Observable<ApiResponse<PerfilPuestoResponse>> {
    return this.api.get<PerfilPuestoResponse>(`${this.path}/${id}`);
  }

  obtenerContextoRegistro(): Observable<ApiResponse<PerfilRegistroContextResponse>> {
    return this.api.get<PerfilRegistroContextResponse>(`${this.path}/contexto-registro`);
  }

  listarNivelesPuesto(): Observable<ApiResponse<NivelPuestoResponse[]>> {
    return this.api.get<NivelPuestoResponse[]>(`${this.path}/niveles-puesto`);
  }

  listarDenominacionesPuesto(): Observable<ApiResponse<DenominacionPuestoResponse[]>> {
    return this.api.get<DenominacionPuestoResponse[]>(`${this.path}/denominaciones-puesto`);
  }

  actualizar(id: number, req: PerfilPuestoRequest): Observable<ApiResponse<PerfilPuestoResponse>> {
    return this.api.put<PerfilPuestoResponse>(`${this.path}/${id}`, req);
  }

  eliminar(id: number): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`${this.path}/${id}`);
  }

  validar(id: number, req: ValidarPerfilRequest): Observable<ApiResponse<PerfilPuestoResponse>> {
    return this.api.put<PerfilPuestoResponse>(`${this.path}/${id}/validar`, req);
  }

  aprobar(id: number, req: AprobarPerfilRequest): Observable<ApiResponse<PerfilPuestoResponse>> {
    return this.api.put<PerfilPuestoResponse>(`${this.path}/${id}/aprobar`, req);
  }

  descargarPdf(id: number): Observable<Blob> {
    return this.api.getBlob(`${this.path}/${id}/pdf`);
  }
}
