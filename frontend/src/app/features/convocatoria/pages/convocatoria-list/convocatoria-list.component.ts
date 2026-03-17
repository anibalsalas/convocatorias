import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConvocatoriaService } from '../../services/convocatoria.service';
import { ConvocatoriaResponse } from '../../models/convocatoria.model';
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { DatePeruPipe } from '@shared/pipes/date-peru.pipe';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-convocatoria-list',
  standalone: true,
  imports: [FormsModule, RouterLink, DataTableComponent, PageHeaderComponent, StatusBadgeComponent, DatePeruPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Convocatorias CAS"
        subtitle="M02 — Elaboración, aprobación y publicación de convocatorias">
        <a routerLink="/sistema/convocatoria/nueva" class="btn-primary">+ Nueva Convocatoria</a>
      </app-page-header>

      <div class="card flex flex-wrap items-end gap-3">
        <div>
          <label class="label-field">Estado</label>
          <select [(ngModel)]="filtroEstado" (ngModelChange)="onFilterChange()" class="input-field w-56" aria-label="Filtrar por estado">
            <option value="">Todos</option>
            <option value="EN_ELABORACION">En elaboración</option>
            <option value="APROBADA">Aprobada</option>
            <option value="PUBLICADA">Publicada</option>
            <option value="EN_SELECCION">En selección</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="DESIERTA">Desierta</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
      </div>

      <app-data-table
        [showSearch]="false"
        [totalElements]="totalElements()"
        [totalPages]="totalPages()"
        [currentPage]="page()"
        (pageChange)="onPageChange($event)">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#1F2133] text-white">
              <th class="px-3 py-2 text-left font-semibold text-xs">N° Convocatoria</th>
              <th class="px-3 py-2 text-left font-semibold text-xs">Descripción</th>
              <th class="px-3 py-2 text-left font-semibold text-xs">Requerimiento</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Estado</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Publicación</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="6" class="px-3 py-8 text-center text-gray-400 text-sm">
                  <span class="animate-spin inline-block mr-2">⟳</span> Cargando convocatorias...
                </td>
              </tr>
            } @else if (convocatorias().length === 0) {
              <tr>
                <td colspan="6" class="px-3 py-8 text-center text-gray-400 text-sm">No se encontraron convocatorias.</td>
              </tr>
            } @else {
              @for (conv of convocatorias(); track conv.idConvocatoria) {
                <tr class="border-t hover:bg-gray-50 transition-colors">
                  <td class="px-3 py-2 font-mono text-xs font-semibold text-[#1F2133]">{{ conv.numeroConvocatoria }}</td>
                  <td class="px-3 py-2 text-gray-800 text-sm">
                    <div class="font-medium">{{ conv.descripcion }}</div>
                    @if (conv.objetoContratacion) {
                      <div class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ conv.objetoContratacion }}</div>
                    }
                  </td>
                  <td class="px-3 py-2 text-gray-700 text-xs">{{ conv.requerimiento?.numeroRequerimiento || '—' }}</td>
                  <td class="px-3 py-2 text-center">
                    <app-status-badge [estado]="conv.estado" [label]="conv.estado" />
                  </td>
                  <td class="px-3 py-2 text-center text-xs text-gray-500">{{ conv.fechaPublicacion ? (conv.fechaPublicacion | datePeru) : '—' }}</td>
                  
                  <td class="px-3 py-2 text-center">
                    <div class="flex justify-center gap-1 flex-wrap">
                      @if (conv.estado === 'EN_ELABORACION') {
                        <!-- ORH: Cronograma (siempre), Comité (cronograma conformado), Ver bases (bases generables), Publicar (bases + acta firmada) -->
                        @if (hasRole('ROLE_ORH') || hasRole('ROLE_ADMIN')) {
                          <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'cronograma']"
                            class="btn-ghost text-xs" title="Cronograma" aria-label="Ir a cronograma">📅</a>
                          @if (conv.cronogramaConformado) {
                            <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'comite']"
                              class="btn-ghost text-xs" title="Comité" aria-label="Ir a comité">👥</a>
                          } @else {
                            <span class="btn-ghost text-xs opacity-40 cursor-not-allowed"
                              title="Comité: requiere cronograma conformado (5 actividades)"
                              aria-label="Comité deshabilitado: cronograma pendiente">👥</span>
                          }
                          @if (conv.basesGeneradas) {
                            <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'bases']"
                              class="btn-ghost text-xs" title="Ver bases" aria-label="Ver bases PDF">📄</a>
                          } @else {
                            <span class="btn-ghost text-xs opacity-40 cursor-not-allowed"
                              title="Ver bases: requiere cronograma y factores con peso 100%"
                              aria-label="Ver bases deshabilitado">📄</span>
                          }
                          @if (conv.basesGeneradas && conv.tieneActaFirmada) {
                            <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'publicar']"
                              class="btn-ghost text-xs" title="Publicar" aria-label="Publicar convocatoria">🚀</a>
                          } @else {
                            <span class="btn-ghost text-xs opacity-40 cursor-not-allowed"
                              title="Publicar: requiere bases generadas y acta de instalación firmada"
                              aria-label="Publicar deshabilitado">🚀</span>
                          }
                        }
                        <!-- COMITÉ: Factores, Acta (siempre visibles) -->
                        @if (hasRole('ROLE_COMITE') || hasRole('ROLE_ADMIN')) {
                          <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'factores']"
                            class="btn-ghost text-xs" title="Factores" aria-label="Ir a factores">⚖️</a>
                          <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'acta']"
                            class="btn-ghost text-xs" title="Acta" aria-label="Ir a acta">📋</a>
                        }
                      }
                      @if (conv.estado === 'PUBLICADA' || conv.estado === 'EN_SELECCION' || conv.estado === 'FINALIZADA' || conv.estado === 'APROBADA') {
                        <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'bases']"
                          class="btn-ghost text-xs" title="Ver bases PDF">📄</a>
                      }
                      @if (conv.estado === 'DESIERTA' || conv.estado === 'CANCELADA') {
                        <span class="text-xs text-gray-400">Sin acciones</span>
                      }
                    </div>
                  </td>

                </tr>
              }
            }
          </tbody>
        </table>
      </app-data-table>
    </div>
  `,
})
export class ConvocatoriaListComponent implements OnInit {
  private readonly convocatoriaService = inject(ConvocatoriaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  readonly convocatorias = signal<ConvocatoriaResponse[]>([]);
  readonly loading = signal(false);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);

  filtroEstado = '';


  hasRole(role: string): boolean {
    return this.auth.hasAnyRole([role]);
  }
  
  ngOnInit(): void { this.loadPage(); }

  onFilterChange(): void { this.page.set(0); this.loadPage(); }

  onPageChange(page: number): void { this.page.set(page); this.loadPage(); }

  private loadPage(): void {
    this.loading.set(true);
    const estado = this.filtroEstado.trim();
    this.convocatoriaService
      .listar({ page: this.page(), size: 10, sort: 'fechaCreacion,desc' }, estado ? { estado } : undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.convocatorias.set(response.data.content);
          this.totalPages.set(response.data.totalPages);
          this.totalElements.set(response.data.totalElements);
          this.loading.set(false);
        },
        error: () => {
          this.convocatorias.set([]);
          this.loading.set(false);
        },
      });
  }
}
