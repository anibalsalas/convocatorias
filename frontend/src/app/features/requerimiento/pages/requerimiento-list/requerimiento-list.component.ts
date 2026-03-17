import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Core & Auth
import { AuthService } from '@core/auth/auth.service';

// Shared
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { DatePeruPipe } from '@shared/pipes/date-peru.pipe';

// Features - Requerimiento
import { RequerimientoResponse } from '../../models/requerimiento.model';
import { RequerimientoService } from '../../services/requerimiento.service';
import { ApiResponse } from '@shared/models/api-response.model';
import { Page } from '@shared/models/pagination.model';

@Component({
  selector: 'app-requerimiento-list',
  standalone: true,
  imports: [RouterLink, FormsModule, StatusBadgeComponent, DatePeruPipe, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header title="Requerimientos de Personal" subtitle="Listado de requerimientos CAS — D.S. 075-2008-PCM">
        @if (canCreateRequirement()) {
          <a routerLink="/sistema/requerimiento/nuevo" class="btn-primary">+ Nuevo Requerimiento</a>
        }
      </app-page-header>

      @if (canVerifyBudget() && pendientesVerificacionPresupuestal() > 0) {
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
             role="status"
             aria-live="polite"
             [attr.aria-label]="'Hay ' + pendientesVerificacionPresupuestal() + ' requerimientos por verificación presupuestal'">
          <span class="font-medium">Hay {{ pendientesVerificacionPresupuestal() }} requerimiento{{ pendientesVerificacionPresupuestal() !== 1 ? 's' : '' }} por verificación presupuestal.</span>
          <button type="button" (click)="filtrarElaborados()" class="ml-2 underline hover:no-underline">Ver pendientes</button>
        </div>
      }

      @if (canVerifyOrh() && conPresupuestoPendientesReglas() > 0) {
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
             role="status"
             aria-live="polite"
             [attr.aria-label]="'Tiene ' + conPresupuestoPendientesReglas() + ' requerimientos con presupuesto, por favor configurar el motor de reglas'">
          <span class="font-medium">Tiene {{ conPresupuestoPendientesReglas() }} requerimiento{{ conPresupuestoPendientesReglas() !== 1 ? 's' : '' }} con presupuesto, por favor configurar el motor de reglas.</span>
          <button type="button" (click)="filtrarConPresupuesto()" class="ml-2 underline hover:no-underline">Ver pendientes</button>
        </div>
      }

      <div class="card flex items-center gap-3 flex-wrap">
        <div>
          <label class="label-field">Estado</label>
          <select [(ngModel)]="filtroEstado" (ngModelChange)="onFiltrosChange()" class="input-field w-48" aria-label="Filtrar por estado">
            <option value="">Todos</option>
            <option value="ELABORADO">Elaborado</option>
            <option value="CON_PRESUPUESTO">Con presupuesto</option>
            <option value="SIN_PRESUPUESTO">Sin presupuesto</option>
            <option value="CONFIGURADO">Configurado</option>
          </select>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow border overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#1F2133] text-white">
              <th class="px-3 py-2 text-left font-semibold text-xs">N° Requerimiento</th>
              <th class="px-3 py-2 text-left font-semibold text-xs">Perfil Asociado</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Puestos</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Presupuesto</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Estado</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Fecha</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="7" class="px-3 py-8 text-center text-gray-400 text-sm"><span class="animate-spin inline-block mr-2">⟳</span> Cargando...</td></tr>
            } @else if (requerimientos().length === 0) {
              <tr><td colspan="7" class="px-3 py-8 text-center text-gray-400 text-sm">No se encontraron requerimientos.</td></tr>
            } @else {
              @for (r of requerimientos(); track r.idRequerimiento) {
                <tr class="border-t hover:bg-gray-50 transition-colors">
                  <td class="px-3 py-2 font-mono text-xs font-semibold text-[#1F2133]">{{ r.numeroRequerimiento }}</td>
                  <td class="px-3 py-2 text-gray-800 text-sm">{{ r.perfil.nombrePuesto || r.perfil.denominacion || '—' }}</td>
                  <td class="px-3 py-2 text-center text-sm">{{ r.cantidadPuestos }}</td>
                  <td class="px-3 py-2 text-center text-sm">
                    @if (r.tienePresupuesto) { <span class="text-green-600 font-semibold">✅ Sí</span> }
                    @else { <span class="text-gray-400">—</span> }
                  </td>
                  <td class="px-3 py-2 text-center"><app-status-badge [estado]="r.estado" [label]="r.estado" /></td>
                  <td class="px-3 py-2 text-center text-xs text-gray-500">{{ r.fechaCreacion | datePeru }}</td>
                  <td class="px-3 py-2 text-center">
                    <div class="flex justify-center gap-1">
                      @if (r.estado === 'ELABORADO' && canVerifyBudget()) {
                        <a [routerLink]="['/sistema/requerimiento', r.idRequerimiento, 'presupuesto']" class="btn-ghost text-xs" title="Verificar presupuesto">💰</a>
                      }
                      @if (r.estado === 'CON_PRESUPUESTO' && canVerifyOrh()) {
                        <a [routerLink]="['/sistema/requerimiento', r.idRequerimiento, 'reglas']" class="btn-ghost text-xs" title="Configurar reglas">⚙️</a>
                      }
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        @if (totalPages() > 1) {
          <div class="px-3 py-2 border-t bg-gray-50 flex items-center justify-between text-xs">
            <span class="text-gray-500">{{ totalElements() }} registros</span>
            <div class="flex gap-1">
              <button (click)="prevPage()" [disabled]="page() === 0" class="px-2 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-40">←</button>
              <span class="px-2 py-1 text-xs">{{ page() + 1 }}/{{ totalPages() }}</span>
              <button (click)="nextPage()" [disabled]="page() >= totalPages() - 1" class="px-2 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-40">→</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class RequerimientoListComponent implements OnInit {
  // Inyecciones
  private svc = inject(RequerimientoService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  // Permisos (D-Rules aplicadas)
  readonly canCreateRequirement = computed(() =>
    this.auth.hasAnyRole(['ROLE_AREA_SOLICITANTE', 'ROLE_ADMIN'])
  );

  readonly canVerifyBudget = computed(() =>
    this.auth.hasAnyRole(['ROLE_OPP', 'ROLE_ADMIN'])
  );

  readonly canVerifyOrh = computed(() =>
    this.auth.hasAnyRole(['ROLE_ORH', 'ROLE_ADMIN'])
  );

  // Estado (Signals)
  requerimientos = signal<RequerimientoResponse[]>([]);
  loading = signal(false);
  page = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  pendientesVerificacionPresupuestal = signal(0);
  conPresupuestoPendientesReglas = signal(0);
  filtroEstado = '';

  // Lifecycle
  ngOnInit(): void {
    this.cargar();
  }

  // Lógica de carga y filtros
  onFiltrosChange(): void {
    this.page.set(0);
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    const filtros: Record<string, string> = {};
    if (this.filtroEstado) filtros['estado'] = this.filtroEstado;

    this.svc.listar({ page: this.page(), size: 10, sort: 'fechaCreacion,desc' }, filtros)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<Page<RequerimientoResponse>>) => {
          this.requerimientos.set(res.data.content);
          this.totalPages.set(res.data.totalPages);
          this.totalElements.set(res.data.totalElements);
          this.loading.set(false);
        },
        error: () => {
          this.requerimientos.set([]);
          this.loading.set(false);
        },
      });

    this.svc.contarPendientesVerificacionPresupuestal()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<number>) => this.pendientesVerificacionPresupuestal.set(res.data ?? 0),
        error: () => this.pendientesVerificacionPresupuestal.set(0),
      });

    this.svc.contarConPresupuestoPendientesReglas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<number>) => this.conPresupuestoPendientesReglas.set(res.data ?? 0),
        error: () => this.conPresupuestoPendientesReglas.set(0),
      });
  }

  filtrarElaborados(): void {
    this.filtroEstado = 'ELABORADO';
    this.page.set(0);
    this.cargar();
  }

  filtrarConPresupuesto(): void {
    this.filtroEstado = 'CON_PRESUPUESTO';
    this.page.set(0);
    this.cargar();
  }

  // Paginación
  prevPage(): void {
    this.page.update(p => Math.max(0, p - 1));
    this.cargar();
  }

  nextPage(): void {
    this.page.update(p => p + 1);
    this.cargar();
  }
}