import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { ApiResponse } from '@shared/models/api-response.model';
import { PostulantePerfil, ActualizarPerfilPostulanteRequest } from '@shared/models/postulante-perfil.model';

/**
 * Servicio para Mi Perfil del postulante.
 * Endpoints: GET /postulantes/mi-perfil, PUT /postulantes/mi-perfil
 */
@Injectable({ providedIn: 'root' })
export class PostulantePerfilService {
  private readonly api = inject(ApiService);

  /**
   * Obtiene el perfil del postulante autenticado.
   */
  getMiPerfil(): Observable<ApiResponse<PostulantePerfil>> {
    return this.api.get<PostulantePerfil>('/postulantes/mi-perfil');
  }

  /**
   * Actualiza el perfil del postulante autenticado.
   */
  actualizarPerfil(req: ActualizarPerfilPostulanteRequest): Observable<ApiResponse<PostulantePerfil>> {
    return this.api.put<PostulantePerfil>('/postulantes/mi-perfil', req);
  }
}
