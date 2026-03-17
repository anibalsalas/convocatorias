import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiService } from '@core/http/api.service';
import { ApiResponse } from '@shared/models/api-response.model';
import { PostulanteExperiencia } from '@shared/models/postulante-experiencia.model';

@Injectable({ providedIn: 'root' })
export class PostulanteExperienciaService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly path = '/postulantes/mi-perfil/experiencias';

  listar(): Observable<ApiResponse<PostulanteExperiencia[]>> {
    return this.api.get<PostulanteExperiencia[]>(this.path);
  }

  registrar(formData: FormData): Observable<ApiResponse<PostulanteExperiencia>> {
    return this.http.post<ApiResponse<PostulanteExperiencia>>(`${this.base}${this.path}`, formData);
  }

  actualizar(
    idExperiencia: number,
    formData: FormData,
  ): Observable<ApiResponse<PostulanteExperiencia>> {
    return this.http.put<ApiResponse<PostulanteExperiencia>>(
      `${this.base}${this.path}/${idExperiencia}`,
      formData,
    );
  }

  eliminar(idExperiencia: number): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`${this.path}/${idExperiencia}`);
  }

  descargarSustento(idExperiencia: number): Observable<Blob> {
    return this.http.get(`${this.base}${this.path}/${idExperiencia}/sustento`, {
      responseType: 'blob',
      observe: 'response',
    }).pipe(
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