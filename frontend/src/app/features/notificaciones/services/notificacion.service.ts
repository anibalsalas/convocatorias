import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@core/http/api.service';
import { ApiResponse } from '@shared/models/api-response.model';
import { Page, PageRequest } from '@shared/models/pagination.model';
import { NotificacionResponse } from '../models/notificacion.model';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly api = inject(ApiService);
  private readonly path = '/notificaciones';

  listar(page: PageRequest, filtros?: Record<string, string>): Observable<ApiResponse<Page<NotificacionResponse>>> {
    return this.api.getPage<NotificacionResponse>(this.path, page, filtros);
  }
}