import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { UbigeoDepartamento } from '@shared/models/ubigeo.model';

/**
 * Servicio para cargar datos de ubigeo Perú (departamento → provincia → distrito).
 * Usa JSON estático en assets.
 */
@Injectable({ providedIn: 'root' })
export class UbigeoService {
  private readonly http = inject(HttpClient);

  private cache$: Observable<UbigeoDepartamento[]> | null = null;

  /**
   * Carga el catálogo de ubigeos. Resultado cacheado con shareReplay.
   */
  getUbigeos(): Observable<UbigeoDepartamento[]> {
    if (!this.cache$) {
      this.cache$ = this.http
        .get<UbigeoDepartamento[]>('assets/data/ubigeo.json')
        .pipe(shareReplay(1));
    }
    return this.cache$;
  }
}
