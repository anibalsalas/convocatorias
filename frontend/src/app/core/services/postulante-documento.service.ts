import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiService } from '@core/http/api.service';
import { ApiResponse } from '@shared/models/api-response.model';
import { PostulanteDocumento } from '@shared/models/postulante-documento.model';

@Injectable({ providedIn: 'root' })
export class PostulanteDocumentoService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly path = '/postulantes/mi-perfil/documentos';

  listar(): Observable<ApiResponse<PostulanteDocumento[]>> {
    return this.api.get<PostulanteDocumento[]>(this.path);
  }

  registrar(formData: FormData): Observable<ApiResponse<PostulanteDocumento>> {
    return this.http.post<ApiResponse<PostulanteDocumento>>(`${this.base}${this.path}`, formData);
  }

  eliminar(idDocumento: number): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`${this.path}/${idDocumento}`);
  }

  descargarSustento(idDocumento: number): Observable<Blob> {
    return this.http.get(`${this.base}${this.path}/${idDocumento}/sustento`, {
      responseType: 'blob',
    });
  }
}