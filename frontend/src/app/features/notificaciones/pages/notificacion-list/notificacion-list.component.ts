import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { DatePeruPipe } from '@shared/pipes/date-peru.pipe';
import { NotificacionService } from '../../services/notificacion.service';
import { NotificacionResponse } from '../../models/notificacion.model';

@Component({
  selector: 'app-notificacion-list',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, StatusBadgeComponent, DatePeruPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Notificaciones"
        subtitle="Bandeja interna de eventos del sistema para el usuario autenticado" />

      <div class="card flex items-center gap-3 flex-wrap">
        <div>
          <label class="label-field">Estado</label>
          <select [(ngModel)]="filtroEstado" (ngModelChange)="onFiltrosChange()" class="input-field w-48" aria-label="Filtrar notificaciones por estado">
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="LEIDA">Leída</option>
            <option value="ENVIADA">Enviada</option>
          </select>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow border overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#1F2133] text-white">
              <th class="px-3 py-2 text-left font-semibold text-xs">Asunto</th>
              <th class="px-3 py-2 text-left font-semibold text-xs">Contenido</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Tipo</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Estado notif.</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Estado proceso</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Fecha</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="6" class="px-3 py-8 text-center text-gray-400 text-sm">
                  <span class="animate-spin inline-block mr-2">⟳</span> Cargando notificaciones...
                </td>
              </tr>
            } @else if (notificaciones().length === 0) {
              <tr>
                <td colspan="6" class="px-3 py-8 text-center text-gray-400 text-sm">
                  No se encontraron notificaciones.
                </td>
              </tr>
            } @else {
              @for (n of notificaciones(); track n.idNotificacion) {
                <tr class="border-t hover:bg-gray-50 transition-colors">
                  <td class="px-3 py-2 font-medium text-gray-800 text-sm">{{ n.asunto }}</td>
                  <td class="px-3 py-2 text-gray-600 text-sm">
                    <div class="line-clamp-2">{{ n.contenido }}</div>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span class="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
                      {{ n.tipoNotificacion }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <app-status-badge [estado]="n.estado" [label]="n.estado" />
                  </td>
                  <td class="px-3 py-2 text-center">
                    @if (n.estadoProceso) {
                      <app-status-badge [estado]="n.estadoProceso" [label]="n.estadoProceso" />
                    } @else {
                      <span class="text-gray-400 text-xs">—</span>
                    }
                  </td>
                  <td class="px-3 py-2 text-center text-xs text-gray-500">{{ n.fechaCreacion | datePeru }}</td>
                </tr>
              }
            }
          </tbody>
        </table>

        @if (totalPages() > 1) {
          <div class="px-4 py-3 border-t bg-gray-50 flex items-center justify-between text-sm">
            <span class="text-gray-500">{{ totalElements() }} registros</span>
            <div class="flex gap-1">
              <button (click)="prevPage()" [disabled]="page() === 0" class="px-3 py-1.5 border rounded-md hover:bg-gray-100 disabled:opacity-40">←</button>
              <span class="px-3 py-1.5">{{ page() + 1 }}/{{ totalPages() }}</span>
              <button (click)="nextPage()" [disabled]="page() >= totalPages() - 1" class="px-3 py-1.5 border rounded-md hover:bg-gray-100 disabled:opacity-40">→</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class NotificacionListComponent implements OnInit {
  private readonly svc = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly notificaciones = signal<NotificacionResponse[]>([]);
  readonly loading = signal(false);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly filtroEstadoSignal = signal('');
  filtroEstado = '';

  readonly hasResults = computed(() => this.notificaciones().length > 0);

  ngOnInit(): void {
    this.cargar();
  }

  onFiltrosChange(): void {
    this.filtroEstadoSignal.set(this.filtroEstado);
    this.page.set(0);
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    const filtros: Record<string, string> = {};
    if (this.filtroEstadoSignal()) {
      filtros['estado'] = this.filtroEstadoSignal();
    }

    this.svc.listar({ page: this.page(), size: 10, sort: 'fechaCreacion,desc' }, filtros)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.notificaciones.set(response.data.content);
          this.totalPages.set(response.data.totalPages);
          this.totalElements.set(response.data.totalElements);
          this.loading.set(false);
        },
        error: () => {
          this.notificaciones.set([]);
          this.totalPages.set(0);
          this.totalElements.set(0);
          this.loading.set(false);
        },
      });
  }

  prevPage(): void {
    this.page.update(p => Math.max(0, p - 1));
    this.cargar();
  }

  nextPage(): void {
    this.page.update(p => p + 1);
    this.cargar();
  }
}