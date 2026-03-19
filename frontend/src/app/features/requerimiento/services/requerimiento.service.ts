import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { ApiResponse } from '@shared/models/api-response.model';
import { Page, PageRequest } from '@shared/models/pagination.model';
import {
  RequerimientoRequest, RequerimientoResponse,
  VerificarPresupuestoRequest, ConfigurarReglasRequest
} from '../models/requerimiento.model';

/**
 * Servicio para E6-E8: Crear requerimiento + verificar presupuesto + configurar reglas.
 * Rules §2.1: Injectable con providedIn root.
 */
@Injectable({ providedIn: 'root' })
export class RequerimientoService {
  private readonly api = inject(ApiService);
  private readonly path = '/requerimientos';

  /** E6: POST /requerimientos — Crear requerimiento */
  crear(req: RequerimientoRequest): Observable<ApiResponse<RequerimientoResponse>> {
    return this.api.post<RequerimientoResponse>(this.path, req);
  }

  /** GET /requerimientos — Listado paginado */
  listar(page: PageRequest, filtros?: Record<string, string>): Observable<ApiResponse<Page<RequerimientoResponse>>> {
    return this.api.getPage<RequerimientoResponse>(this.path, page, filtros);
  }

  /** Cuenta requerimientos pendientes de verificación presupuestal */
  contarPendientesVerificacionPresupuestal(): Observable<ApiResponse<number>> {
    return this.api.get<number>(`${this.path}/count-pendientes-verificacion-presupuestal`);
  }

  /** Cuenta requerimientos con presupuesto pendientes de configurar motor de reglas */
  contarConPresupuestoPendientesReglas(): Observable<ApiResponse<number>> {
    return this.api.get<number>(`${this.path}/count-con-presupuesto-pendientes-reglas`);
  }

  /** Cuenta requerimientos CONFIGURADO sin convocatoria (banner ORH — pendientes Etapa 2) */
  contarConfiguradosSinConvocatoria(): Observable<ApiResponse<number>> {
    return this.api.get<number>(`${this.path}/count-configurados-sin-convocatoria`);
  }

  /** GET /requerimientos/{id} — Detalle */
  obtener(id: number): Observable<ApiResponse<RequerimientoResponse>> {
    return this.api.get<RequerimientoResponse>(`${this.path}/${id}`);
  }

  /** E7: POST /requerimientos/{id}/verificar-presupuesto */
  verificarPresupuesto(id: number, req: VerificarPresupuestoRequest): Observable<ApiResponse<RequerimientoResponse>> {
    return this.api.post<RequerimientoResponse>(`${this.path}/${id}/verificar-presupuesto`, req);
  }

  /** E8: POST /requerimientos/{id}/configurar-reglas */
  configurarReglas(id: number, req: ConfigurarReglasRequest): Observable<ApiResponse<RequerimientoResponse>> {
    return this.api.post<RequerimientoResponse>(`${this.path}/${id}/configurar-reglas`, req);
  }
}
