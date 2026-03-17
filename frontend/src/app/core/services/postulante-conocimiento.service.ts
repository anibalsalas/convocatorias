import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiService } from '@core/http/api.service';
import { ApiResponse } from '@shared/models/api-response.model';
import { PostulanteConocimiento } from '@shared/models/postulante-conocimiento.model';

@Injectable({ providedIn: 'root' })
export class PostulanteConocimientoService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly path = '/postulantes/mi-perfil/conocimientos';

  listar(): Observable<ApiResponse<PostulanteConocimiento[]>> {
    return this.api.get<PostulanteConocimiento[]>(this.path);
  }

  registrar(formData: FormData): Observable<ApiResponse<PostulanteConocimiento>> {
    return this.http.post<ApiResponse<PostulanteConocimiento>>(`${this.base}${this.path}`, formData);
  }

  actualizar(
    idConocimiento: number,
    formData: FormData,
  ): Observable<ApiResponse<PostulanteConocimiento>> {
    return this.http.put<ApiResponse<PostulanteConocimiento>>(
      `${this.base}${this.path}/${idConocimiento}`,
      formData,
    );
  }

  eliminar(idConocimiento: number): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`${this.path}/${idConocimiento}`);
  }

  descargarSustento(idConocimiento: number): Observable<Blob> {
    return this.http
      .get(`${this.base}${this.path}/${idConocimiento}/sustento`, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response) => {
          const contentType = response.headers.get('Content-Type') ?? '';
          if (response.status !== 200 || !contentType.includes('application/pdf')) {
            throw new Error('La respuesta no es un PDF válido');
          }
          const body = response.body;
          if (!body || body.size === 0) {
            throw new Error('El archivo PDF está vacío');
          }
          return new Blob([body], { type: 'application/pdf' });
        }),
      );
  }
}