import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import { ApiService } from '@core/http/api.service';
import { ApiResponse } from '@shared/models/api-response.model';
import { Page, PageRequest } from '@shared/models/pagination.model';
import {
  ExpedienteItem,
  PostulacionItem,
  RegistrarPostulacionRequest,
} from '@shared/models/postulacion.model';

@Injectable({ providedIn: 'root' })
export class PostulacionService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly path = '/postulaciones';

  registrar(
    request: RegistrarPostulacionRequest,
  ): Observable<ApiResponse<PostulacionItem>> {
    return this.api.post<PostulacionItem>(this.path, request);
  }

  listarMisPostulaciones(
    pageRequest: PageRequest,
  ): Observable<ApiResponse<Page<PostulacionItem>>> {
    return this.api.getPage<PostulacionItem>(this.path, pageRequest);
  }

  listarExpediente(
    idPostulacion: number,
  ): Observable<ApiResponse<ExpedienteItem[]>> {
    return this.api.get<ExpedienteItem[]>(`${this.path}/${idPostulacion}/expediente`);
  }



  obtenerMiPostulacion(
    idPostulacion: number,
  ): Observable<ApiResponse<PostulacionItem>> {
    return this.api.get<PostulacionItem>(`${this.path}/${idPostulacion}`);
  }
  
  finalizarExpediente(
    idPostulacion: number,
  ): Observable<ApiResponse<PostulacionItem>> {
    return this.api.post<PostulacionItem>(
      `${this.path}/${idPostulacion}/finalizar-expediente`,
      {},
    );
  }
  
  cargarExpediente(
    idPostulacion: number,
    tipoDocumento: string,
    archivo: File,
  ): Observable<ApiResponse<ExpedienteItem>> {
    const formData = new FormData();
    formData.append('tipoDocumento', tipoDocumento);
    formData.append('archivo', archivo, archivo.name);

    return this.http.post<ApiResponse<ExpedienteItem>>(
      `${this.base}${this.path}/${idPostulacion}/expediente`,
      formData,
    );
  }
}