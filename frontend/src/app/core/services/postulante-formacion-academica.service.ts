import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ApiService } from '@core/http/api.service';
import { ApiResponse } from '@shared/models/api-response.model';
import { PostulanteFormacionAcademica } from '@shared/models/postulante-formacion-academica.model';

@Injectable({ providedIn: 'root' })
export class PostulanteFormacionAcademicaService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly path = '/postulantes/mi-perfil/formaciones-academicas';

  listar(): Observable<ApiResponse<PostulanteFormacionAcademica[]>> {
    return this.api.get<PostulanteFormacionAcademica[]>(this.path);
  }

  registrar(formData: FormData): Observable<ApiResponse<PostulanteFormacionAcademica>> {
    return this.http.post<ApiResponse<PostulanteFormacionAcademica>>(`${this.base}${this.path}`, formData);
  }

  actualizar(
    idFormacionAcademica: number,
    formData: FormData,
  ): Observable<ApiResponse<PostulanteFormacionAcademica>> {
    return this.http.put<ApiResponse<PostulanteFormacionAcademica>>(
      `${this.base}${this.path}/${idFormacionAcademica}`,
      formData,
    );
  }

  eliminar(idFormacionAcademica: number): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`${this.path}/${idFormacionAcademica}`);
  }

  descargarSustento(idFormacionAcademica: number): Observable<Blob> {
    return this.http.get(`${this.base}${this.path}/${idFormacionAcademica}/sustento`, {
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