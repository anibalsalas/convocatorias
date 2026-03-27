import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '@core/http/api.service';
import { AreaOrganizacional, AreaRequest } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AreaAdminService {
  private readonly api = inject(ApiService);
  private readonly path = '/admin/areas';

  listar(): Observable<AreaOrganizacional[]> {
    return this.api.get<AreaOrganizacional[]>(this.path).pipe(map((r) => r.data));
  }

  crear(req: AreaRequest): Observable<AreaOrganizacional> {
    return this.api.post<AreaOrganizacional>(this.path, req).pipe(map((r) => r.data));
  }

  actualizar(id: number, req: AreaRequest): Observable<AreaOrganizacional> {
    return this.api.put<AreaOrganizacional>(`${this.path}/${id}`, req).pipe(map((r) => r.data));
  }
}
