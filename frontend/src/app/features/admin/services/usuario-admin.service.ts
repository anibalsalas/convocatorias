import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '@core/http/api.service';
import { UsuarioAdmin, UsuarioRequest, UsuarioUpdateRequest } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class UsuarioAdminService {
  private readonly api = inject(ApiService);
  private readonly path = '/admin/usuarios';

  listar(): Observable<UsuarioAdmin[]> {
    return this.api.get<UsuarioAdmin[]>(this.path).pipe(map((r) => r.data));
  }

  crear(req: UsuarioRequest): Observable<UsuarioAdmin> {
    return this.api.post<UsuarioAdmin>(this.path, req).pipe(map((r) => r.data));
  }

  actualizar(id: number, req: UsuarioUpdateRequest): Observable<UsuarioAdmin> {
    return this.api.put<UsuarioAdmin>(`${this.path}/${id}`, req).pipe(map((r) => r.data));
  }

  activar(id: number): Observable<UsuarioAdmin> {
    return this.api.patch<UsuarioAdmin>(`${this.path}/${id}/activar`, {}).pipe(map((r) => r.data));
  }

  desactivar(id: number): Observable<UsuarioAdmin> {
    return this.api.patch<UsuarioAdmin>(`${this.path}/${id}/desactivar`, {}).pipe(map((r) => r.data));
  }
}
