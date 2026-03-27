import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { ApiResponse } from '@shared/models/api-response.model';
import { Page, PageRequest } from '@shared/models/pagination.model';
import {
  ActividadCronogramaResponse, ActaResponse, AprobarConvocatoriaRequest,
  ComiteDetalleResponse, ComiteRequest, ComiteResponse, ConvocatoriaFiltros,
  ConvocatoriaRequest, ConvocatoriaResponse, CronogramaRequest, CronogramaResponse,
  FactorDetalleResponse, FactorEvaluacionRequest, FactorEvaluacionResponse,
  FactorFactorRequest, MiembroComiteRequest, MiembroDetalleItem,
} from '../models/convocatoria.model';

@Injectable({ providedIn: 'root' })
export class ConvocatoriaService {
  private readonly api = inject(ApiService);
  private readonly path = '/convocatorias';

  obtenerSiguienteNumero(): Observable<ApiResponse<string>> {
    return this.api.get<string>(`${this.path}/next-number`);
  }

  crear(req: ConvocatoriaRequest): Observable<ApiResponse<ConvocatoriaResponse>> {
    return this.api.post<ConvocatoriaResponse>(this.path, req);
  }

  listar(page: PageRequest, filtros?: ConvocatoriaFiltros): Observable<ApiResponse<Page<ConvocatoriaResponse>>> {
    const params: Record<string, string> = {};
    if (filtros?.estado) params['estado'] = filtros.estado;
    return this.api.getPage<ConvocatoriaResponse>(this.path, page, params);
  }

  obtener(id: number): Observable<ApiResponse<ConvocatoriaResponse>> {
    return this.api.get<ConvocatoriaResponse>(`${this.path}/${id}`);
  }

  actualizar(id: number, req: { descripcion: string; objetoContratacion?: string }): Observable<ApiResponse<ConvocatoriaResponse>> {
    return this.api.put<ConvocatoriaResponse>(`${this.path}/${id}`, req);
  }

  obtenerCronograma(id: number): Observable<ApiResponse<ActividadCronogramaResponse[]>> {
    return this.api.get<ActividadCronogramaResponse[]>(`${this.path}/${id}/cronograma`);
  }

  registrarCronograma(id: number, req: CronogramaRequest): Observable<ApiResponse<CronogramaResponse>> {
    return this.api.post<CronogramaResponse>(`${this.path}/${id}/cronograma`, req);
  }

  // ═══ COMITÉ: GET detalle + POST batch (E11) ═══

  obtenerComite(id: number): Observable<ApiResponse<ComiteDetalleResponse>> {
    return this.api.get<ComiteDetalleResponse>(`${this.path}/${id}/comite`);
  }

  notificarComite(id: number): Observable<ApiResponse<void>> {
    return this.api.post<void>(`${this.path}/${id}/comite/notificar`, {});
  }

  registrarComite(id: number, req: ComiteRequest): Observable<ApiResponse<ComiteResponse>> {
    return this.api.post<ComiteResponse>(`${this.path}/${id}/comite`, req);
  }

  // ═══ CRUD INDIVIDUAL MIEMBROS ═══

  agregarMiembro(idConv: number, req: MiembroComiteRequest): Observable<ApiResponse<MiembroDetalleItem>> {
    return this.api.post<MiembroDetalleItem>(`${this.path}/${idConv}/comite/miembros`, req);
  }

  actualizarMiembro(idConv: number, idMiembro: number, req: MiembroComiteRequest): Observable<ApiResponse<MiembroDetalleItem>> {
    return this.api.put<MiembroDetalleItem>(`${this.path}/${idConv}/comite/miembros/${idMiembro}`, req);
  }

  eliminarMiembro(idConv: number, idMiembro: number): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`${this.path}/${idConv}/comite/miembros/${idMiembro}`);
  }

  notificarMiembro(idConv: number, idMiembro: number): Observable<ApiResponse<void>> {
    return this.api.post<void>(`${this.path}/${idConv}/comite/miembros/${idMiembro}/notificar`, {});
  }

  // ═══ E12 — Factores (CRUD individual + batch) ═══

  listarFactores(id: number): Observable<ApiResponse<FactorDetalleResponse[]>> {
    return this.api.get<FactorDetalleResponse[]>(`${this.path}/${id}/factores`);
  }

  registrarFactores(id: number, req: FactorEvaluacionRequest): Observable<ApiResponse<FactorEvaluacionResponse>> {
    return this.api.post<FactorEvaluacionResponse>(`${this.path}/${id}/factores`, req);
  }

  agregarFactor(id: number, req: FactorFactorRequest): Observable<ApiResponse<FactorDetalleResponse>> {
    return this.api.post<FactorDetalleResponse>(`${this.path}/${id}/factores/individual`, req);
  }

  actualizarFactor(id: number, idFactor: number, req: FactorFactorRequest): Observable<ApiResponse<FactorDetalleResponse>> {
    return this.api.put<FactorDetalleResponse>(`${this.path}/${id}/factores/${idFactor}`, req);
  }

  eliminarFactor(id: number, idFactor: number): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`${this.path}/${id}/factores/${idFactor}`);
  }

  // ═══ E13–E16 ═══

  obtenerActa(id: number): Observable<ApiResponse<ActaResponse>> {
    return this.api.get<ActaResponse>(`${this.path}/${id}/acta-instalacion`);
  }

  descargarActaPdf(id: number): Observable<Blob> {
    return this.api.getBlob(`${this.path}/${id}/acta-instalacion/pdf`);
  }

  generarActaInstalacion(id: number): Observable<ApiResponse<ActaResponse>> {
    return this.api.post<ActaResponse>(`${this.path}/${id}/acta-instalacion`, {});
  }

  cargarActaFirmada(id: number, archivo: File, fechaFirma?: string | null): Observable<ApiResponse<ActaResponse>> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    if (fechaFirma) fd.append('fechaFirma', fechaFirma);
    return this.api.put<ActaResponse>(`${this.path}/${id}/acta-instalacion/cargar`, fd);
  }

  notificarActaOrh(id: number): Observable<ApiResponse<ConvocatoriaResponse>> {
    return this.api.post<ConvocatoriaResponse>(`${this.path}/${id}/notificar-acta-orh`, {});
  }

  aprobar(id: number, req: AprobarConvocatoriaRequest): Observable<ApiResponse<ConvocatoriaResponse>> {
    return this.api.put<ConvocatoriaResponse>(`${this.path}/${id}/aprobar`, req);
  }

  descargarBasesPdf(id: number): Observable<Blob> {
    return this.api.getBlob(`${this.path}/${id}/bases-pdf`);
  }
}
