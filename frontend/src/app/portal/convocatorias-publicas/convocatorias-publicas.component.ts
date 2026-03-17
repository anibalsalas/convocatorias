import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, catchError, concat, of, map, timeout } from 'rxjs';

import { ApiService } from '@core/http/api.service';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { Page } from '@shared/models/pagination.model';

interface ConvPublica {
  idConvocatoria: number;
  numeroConvocatoria: string;
  descripcion: string;
  objetoContratacion: string;
  estado: string;
  anio: number;
  unidadOrganica: string;
  fuenteFinanciamiento: string;
  fechaPublicacion: string;
  fechaIniPostulacion: string;
  fechaFinPostulacion: string;
  fechaEvaluacion: string;
  fechaResultado: string;
  linkPortalAcffaa: string;
  linkTalentoPeru: string;
}

interface PageResult {
  state: 'loading' | 'success' | 'error';
  data?: Page<ConvPublica>;
}

@Component({
  selector: 'app-convocatorias-publicas',
  standalone: true,
  imports: [RouterLink, FormsModule, StatusBadgeComponent],
  templateUrl: './convocatorias-publicas.component.html',
  styleUrl: './convocatorias-publicas.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConvocatoriasPublicasComponent {
  private api = inject(ApiService);

  readonly query = signal({
    page: 0,
    year: new Date().getFullYear(),
  });

  readonly anioSeleccionado = computed(() => this.query().year);
  readonly currentPage = computed(() => this.query().page);

  readonly anios = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  readonly skeletonRows = [1, 2, 3, 4, 5];

  private readonly pageResult = toSignal(
    toObservable(this.query).pipe(
      switchMap((q) =>
        concat(
          of<PageResult>({ state: 'loading' }),
          this.api
            .getPage<ConvPublica>(
              '/convocatorias/publicas',
              {
                page: q.page,
                size: 20,
                sort: 'fechaPublicacion,desc',
              },
              { anio: String(q.year) },
            )
            .pipe(
              timeout(10000),
              map((res) => ({ state: 'success' as const, data: res.data })),
              catchError(() => of<PageResult>({ state: 'error' })),
            ),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as PageResult },
  );

  readonly loading = computed(() => this.pageResult()?.state === 'loading');
  readonly error = computed(() => this.pageResult()?.state === 'error');
  readonly convocatorias = computed(() => this.pageResult()?.data?.content ?? []);
  readonly totalPages = computed(() => this.pageResult()?.data?.totalPages ?? 0);
  readonly totalElements = computed(() => this.pageResult()?.data?.totalElements ?? 0);

  onAnioChange(value: number | string): void {
    this.query.update((q) => ({
      ...q,
      year: Number(value),
      page: 0,
    }));
  }

  prevPage(): void {
    const page = this.currentPage();
    if (page === 0) return;
    this.query.update((q) => ({ ...q, page: page - 1 }));
  }

  nextPage(): void {
    const page = this.currentPage();
    if (page >= this.totalPages() - 1) return;
    this.query.update((q) => ({ ...q, page: page + 1 }));
  }

  reload(): void {
    this.query.update((q) => ({ ...q }));
  }
}
