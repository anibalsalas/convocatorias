import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '@core/http/api.service';
import { Page } from '@shared/models/pagination.model';
import { LogTransparencia } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class LogAdminService {
  private readonly api = inject(ApiService);
  private readonly path = '/admin/logs';

  listar(page = 0, size = 20): Observable<Page<LogTransparencia>> {
    return this.api
      .getPage<LogTransparencia>(this.path, { page, size })
      .pipe(map((r) => r.data));
  }
}
