import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { concat, of, switchMap, map, catchError } from 'rxjs';

import { PostulacionService } from '@core/services/postulacion.service';
import { ToastService } from '@core/services/toast.service';
import { Page } from '@shared/models/pagination.model';
import { PostulacionItem } from '@shared/models/postulacion.model';

interface PageResult {
  state: 'loading' | 'success' | 'error';
  data?: Page<PostulacionItem>;
}

@Component({
  selector: 'app-mis-postulaciones',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './mis-postulaciones.component.html',
  styleUrl: './mis-postulaciones.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisPostulacionesComponent {
  private readonly postulacionService = inject(PostulacionService);
  private readonly toast = inject(ToastService);

  readonly query = signal({ page: 0 });
  readonly currentPage = computed(() => this.query().page);

  private readonly pageResult = toSignal(
    toObservable(this.query).pipe(
      switchMap((q) =>
        concat(
          of<PageResult>({ state: 'loading' }),
          this.postulacionService
            .listarMisPostulaciones({
              page: q.page,
              size: 10,
              sort: 'fechaPostulacion,desc',
            })
            .pipe(
              map((res) => ({ state: 'success' as const, data: res.data })),
              catchError(() => of<PageResult>({ state: 'error' })),
            ),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as PageResult },
  );

  readonly loading = computed(() => this.pageResult()?.state === 'loading');
  readonly postulaciones = computed(() => this.pageResult()?.data?.content ?? []);
  readonly totalPages = computed(() => this.pageResult()?.data?.totalPages ?? 0);
  readonly totalElements = computed(() => this.pageResult()?.data?.totalElements ?? 0);

  readonly pendingExpedienteCount = computed(
    () =>
      this.postulaciones().filter(
        (item) => item.estadoExpediente === 'EXPEDIENTE PENDIENTE',
      ).length,
  );

  readonly inProgressExpedienteCount = computed(
    () =>
      this.postulaciones().filter(
        (item) => item.estadoExpediente === 'EXPEDIENTE EN CARGA',
      ).length,
  );

  readonly showAttentionBanner = computed(
    () => this.pendingExpedienteCount() > 0 || this.inProgressExpedienteCount() > 0,
  );

  readonly firstActionablePostulationId = computed(() => {
    const pending = this.postulaciones().find(
      (item) => item.estadoExpediente === 'EXPEDIENTE PENDIENTE',
    );
    if (pending) {
      return pending.idPostulacion;
    }

    const inProgress = this.postulaciones().find(
      (item) => item.estadoExpediente === 'EXPEDIENTE EN CARGA',
    );
    return inProgress?.idPostulacion ?? null;
  });

  readonly skeletonRows = [1, 2, 3];

  constructor() {
    effect(() => {
      if (this.pageResult()?.state === 'error') {
        this.toast.error('No se pudo obtener la lista de sus postulaciones.');
      }
    });
  }

  prevPage(): void {
    if (this.currentPage() === 0) return;
    this.query.update((q) => ({ ...q, page: q.page - 1 }));
  }

  nextPage(): void {
    if (this.currentPage() >= this.totalPages() - 1) return;
    this.query.update((q) => ({ ...q, page: q.page + 1 }));
  }

  expedienteLabel(item: PostulacionItem): string {
    const total = item.totalExpedientes ?? 0;
    return `${total} archivo(s)`;
  }

  expedienteActionLabel(item: PostulacionItem): string {
    switch (item.estadoExpediente) {
      case 'EXPEDIENTE COMPLETO':
        return 'Ver expediente';
      case 'EXPEDIENTE EN CARGA':
        return 'Continuar expediente';
      default:
        return 'Completar expediente ahora';
    }
  }

  postulacionStatusLabel(item: PostulacionItem): string {
    return item.estadoPostulacionVisible || item.estado;
  }

  postulacionStatusClass(item: PostulacionItem): string {
    return item.estadoPostulacionVisible === 'POSTULACIÓN EXITOSA'
      ? 'postulacion-badge postulacion-badge--success'
      : 'postulacion-badge postulacion-badge--registered';
  }

  expedienteStatusLabel(item: PostulacionItem): string {
    return item.estadoExpediente || 'EXPEDIENTE PENDIENTE';
  }

  expedienteStatusClass(item: PostulacionItem): string {
    switch (item.estadoExpediente) {
      case 'EXPEDIENTE COMPLETO':
        return 'expediente-badge expediente-badge--complete';
      case 'EXPEDIENTE EN CARGA':
        return 'expediente-badge expediente-badge--progress';
      default:
        return 'expediente-badge expediente-badge--pending';
    }
  }

  expedienteHelpText(item: PostulacionItem): string {
    switch (item.estadoExpediente) {
      case 'EXPEDIENTE COMPLETO':
        return 'Expediente finalizado. Su postulación quedó lista para validación y filtro de requisitos mínimos.';
      case 'EXPEDIENTE EN CARGA':
        return 'Tiene avance en el expediente, pero aún debe revisarlo y continuarlo.';
      default:
        return 'La postulación fue registrada, pero todavía no tiene expediente cargado.';
    }
  }

  bannerTitle(): string {
    const pending = this.pendingExpedienteCount();
    const inProgress = this.inProgressExpedienteCount();

    if (pending > 0) {
      return `Tiene ${pending} postulación(es) con expediente pendiente.`;
    }

    return `Tiene ${inProgress} postulación(es) con expediente en carga.`;
  }

  bannerDescription(): string {
    return 'Registrar la postulación no finaliza el trámite. Debe completar o continuar el expediente virtual para que la postulación siga su flujo de evaluación.';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }
}