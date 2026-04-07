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
import { ConvocatoriaEditarModalComponent } from '../convocatoria-editar-modal/convocatoria-editar-modal.component';
import { NotificacionService } from '@features/notificaciones/services/notificacion.service';

@Component({
  selector: 'app-convocatoria-list',
  standalone: true,
  imports: [FormsModule, RouterLink, DataTableComponent, PageHeaderComponent, StatusBadgeComponent, DatePeruPipe, ConvocatoriaEditarModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (modalIdConvocatoria()) {
      <app-convocatoria-editar-modal
        [idConvocatoria]="modalIdConvocatoria()!"
        (cerrado)="onModalCerrado($event)" />
    }

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
              <th class="px-1 py-2 text-center font-semibold text-xs whitespace-nowrap">Ver Convocatoria</th>
              <th class="px-3 py-2 text-left font-semibold text-xs">Requerimiento</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Estado</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Publicación</th>
              @if (hasRole('ROLE_ORH') || hasRole('ROLE_ADMIN')) {
                <th class="px-1 py-2 text-center font-semibold text-xs whitespace-nowrap">Cronograma</th>
                <th class="px-1 py-2 text-center font-semibold text-xs">Comité</th>
                <th class="px-1 py-2 text-center font-semibold text-xs whitespace-nowrap">Ver Bases</th>
                <th class="px-1 py-2 text-center font-semibold text-xs whitespace-nowrap">Publicar Convocatoria</th>
              }
              @if (hasRole('ROLE_COMITE') || hasRole('ROLE_ADMIN')) {
                <th class="px-1 py-2 text-center font-semibold text-xs">Factores</th>
                <th class="px-1 py-2 text-center font-semibold text-xs">Acta</th>
              }
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="12" class="px-3 py-8 text-center text-gray-400 text-sm">
                  <span class="animate-spin inline-block mr-2">⟳</span> Cargando convocatorias...
                </td>
              </tr>
            } @else if (convocatorias().length === 0) {
              <tr>
                <td colspan="12" class="px-3 py-8 text-center text-gray-400 text-sm">No se encontraron convocatorias.</td>
              </tr>
            } @else {
              @for (conv of convocatorias(); track conv.idConvocatoria) {
                <tr class="border-t hover:bg-gray-50 transition-colors">
                  <td class="px-3 py-2 font-mono text-xs font-semibold text-[#1F2133]">
                    {{ conv.numeroConvocatoria }}
                    @if (hasRole('ROLE_COMITE') && conv.estado === 'EN_ELABORACION' && tienePendiente(conv.idConvocatoria)) {
                      <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 ml-1 align-middle"
                            title="Tiene tareas pendientes: elaborar factores y generar acta de instalación">
                        ● Pendiente
                      </span>
                    }
                    @if ((hasRole('ROLE_ORH') || hasRole('ROLE_ADMIN')) && conv.estado === 'EN_ELABORACION' && conv.notificacionActaEnviada) {
                      <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 ml-1 align-middle"
                            title="El Comité notificó que el acta está firmada. Esta convocatoria está lista para su publicación.">
● Listo para publicar
                      </span>
                    }
                    @if ((hasRole('ROLE_ORH') || hasRole('ROLE_ADMIN')) && conv.estado === 'EN_ELABORACION' && conv.comitePendienteNotificarOrh) {
                      <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'comite']"
                         class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 ml-1 align-middle hover:bg-rose-100"
                         title="Debe usar «Notificar a Comité» para avisar a los usuarios con rol COMITE">
                        ● Falta notificar comité
                      </a>
                    }
                  </td>
                  <td class="px-3 py-2 text-gray-800 text-sm">
                    <div class="font-medium">{{ conv.descripcion }}</div>
                    @if (conv.objetoContratacion) {
                      <div class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ conv.objetoContratacion }}</div>
                    }
                  </td>
                  <td class="px-1 py-2 text-center align-middle">
                    <button
                      (click)="abrirModal(conv.idConvocatoria)"
                      class="btn-ghost text-xs"
                      title="Ver / Editar convocatoria"
                      aria-label="Ver y editar convocatoria">👁</button>
                  </td>
                  <td class="px-3 py-2 text-gray-700 text-xs">{{ conv.requerimiento?.numeroRequerimiento || '—' }}</td>
                  <td class="px-3 py-2 text-center">
                    <app-status-badge [estado]="conv.estado" [label]="conv.estado" />
                  </td>
                  <td class="px-3 py-2 text-center text-xs text-gray-500">{{ conv.fechaPublicacion ? (conv.fechaPublicacion | datePeru) : '—' }}</td>

                  @if (conv.estado === 'DESIERTA' || conv.estado === 'CANCELADA') {
                    @if (hasRole('ROLE_ORH') || hasRole('ROLE_ADMIN')) {
                      <td colspan="4" class="px-3 py-2 text-center text-xs text-gray-400">Sin acciones</td>
                    }
                    @if (hasRole('ROLE_COMITE') || hasRole('ROLE_ADMIN')) {
                      <td colspan="2" class="px-3 py-2 text-center text-xs text-gray-400">Sin acciones</td>
                    }
                  } @else {
                    @if (hasRole('ROLE_ORH') || hasRole('ROLE_ADMIN')) {
                      <td class="px-1 py-2 text-center align-middle">
                        @if (conv.estado === 'EN_ELABORACION') {
                          <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'cronograma']"
                            class="btn-ghost text-xs" title="Cronograma" aria-label="Ir a cronograma">📅</a>
                        } @else if (conv.estado === 'PUBLICADA' || conv.estado === 'EN_SELECCION' || conv.estado === 'FINALIZADA' || conv.estado === 'APROBADA') {
                          <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'cronograma']"
                            [queryParams]="{ modo: 'lectura' }"
                            class="btn-ghost text-xs" title="Cronograma (solo lectura)" aria-label="Cronograma en solo lectura">📅</a>
                        } @else {
                          <span class="text-gray-400" aria-hidden="true">—</span>
                        }
                      </td>
                      <td class="px-1 py-2 text-center align-middle">
                        @if (conv.estado === 'EN_ELABORACION') {
                          @if (conv.cronogramaConformado) {
                            <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'comite']"
                              class="btn-ghost text-xs" title="Comité" aria-label="Ir a comité">👥</a>
                          } @else {
                            <span class="btn-ghost text-xs opacity-40 cursor-not-allowed"
                              title="Comité: requiere cronograma conformado (5 actividades)"
                              aria-label="Comité deshabilitado: cronograma pendiente">👥</span>
                          }
                        } @else if (conv.estado === 'PUBLICADA' || conv.estado === 'EN_SELECCION' || conv.estado === 'FINALIZADA' || conv.estado === 'APROBADA') {
                          <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'comite']"
                            [queryParams]="{ modo: 'lectura' }"
                            class="btn-ghost text-xs" title="Comité (solo lectura)" aria-label="Comité en solo lectura">👥</a>
                        } @else {
                          <span class="text-gray-400" aria-hidden="true">—</span>
                        }
                      </td>
                      <td class="px-1 py-2 text-center align-middle">
                        @if (conv.estado === 'EN_ELABORACION') {
                          @if (conv.basesGeneradas) {
                            <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'bases']"
                              class="btn-ghost text-xs" title="Ver bases" aria-label="Ver bases PDF">📄</a>
                          } @else {
                            <span class="btn-ghost text-xs opacity-40 cursor-not-allowed"
                              title="Ver bases: requiere cronograma y factores con peso 100%"
                              aria-label="Ver bases deshabilitado">📄</span>
                          }
                        } @else if (conv.estado === 'PUBLICADA' || conv.estado === 'EN_SELECCION' || conv.estado === 'FINALIZADA' || conv.estado === 'APROBADA') {
                          <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'bases']"
                            class="btn-ghost text-xs" title="Ver bases PDF" aria-label="Ver bases PDF">📄</a>
                        } @else {
                          <span class="text-gray-400" aria-hidden="true">—</span>
                        }
                      </td>
                      <td class="px-1 py-2 text-center align-middle">
                        @if (conv.estado === 'EN_ELABORACION') {
                          @if (conv.basesGeneradas && conv.tieneActaFirmada) {
                            <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'publicar']"
                              class="btn-ghost text-xs" title="Publicar" aria-label="Publicar convocatoria">🚀</a>
                          } @else {
                            <span class="btn-ghost text-xs opacity-40 cursor-not-allowed"
                              title="Publicar: requiere bases generadas y acta de instalación firmada"
                              aria-label="Publicar deshabilitado">🚀</span>
                          }
                        } @else {
                          <span class="text-gray-400" aria-hidden="true">—</span>
                        }
                      </td>
                    }
                    @if (hasRole('ROLE_COMITE') || hasRole('ROLE_ADMIN')) {
                      <td class="px-1 py-2 text-center align-middle">
                        @if (conv.estado === 'EN_ELABORACION') {
                          @if (hasRole('ROLE_ADMIN') || comiteRegistrado(conv.idConvocatoria)) {
                            <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'factores']"
                              class="btn-ghost text-xs" title="Factores" aria-label="Ir a factores">⚖️</a>
                          } @else {
                            <span class="btn-ghost text-xs opacity-40 cursor-not-allowed"
                              title="Requiere que ORH registre el comité" aria-label="Factores deshabilitado">⚖️</span>
                          }
                        } @else if (conv.estado === 'PUBLICADA' || conv.estado === 'EN_SELECCION' || conv.estado === 'FINALIZADA' || conv.estado === 'APROBADA') {
                          <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'factores']"
                            [queryParams]="{ modo: 'lectura' }"
                            class="btn-ghost text-xs" title="Factores (solo lectura)" aria-label="Factores en solo lectura">⚖️</a>
                        } @else {
                          <span class="text-gray-400" aria-hidden="true">—</span>
                        }
                      </td>
                      <td class="px-1 py-2 text-center align-middle">
                        @if (conv.estado === 'EN_ELABORACION') {
                          @if (hasRole('ROLE_ADMIN') || comiteRegistrado(conv.idConvocatoria)) {
                            <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'acta']"
                              class="btn-ghost text-xs" title="Acta" aria-label="Ir a acta">📋</a>
                          } @else {
                            <span class="btn-ghost text-xs opacity-40 cursor-not-allowed"
                              title="Requiere que ORH registre el comité" aria-label="Acta deshabilitada">📋</span>
                          }
                        } @else if (conv.estado === 'PUBLICADA' || conv.estado === 'EN_SELECCION' || conv.estado === 'FINALIZADA' || conv.estado === 'APROBADA') {
                          <a [routerLink]="['/sistema/convocatoria', conv.idConvocatoria, 'acta']"
                            [queryParams]="{ modo: 'lectura' }"
                            class="btn-ghost text-xs" title="Acta (solo lectura)" aria-label="Acta en solo lectura">📋</a>
                        } @else {
                          <span class="text-gray-400" aria-hidden="true">—</span>
                        }
                      </td>
                    }
                  }

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
  private readonly notificacionService = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  readonly convocatorias = signal<ConvocatoriaResponse[]>([]);
  readonly loading = signal(false);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly modalIdConvocatoria = signal<number | null>(null);
  readonly idsPendienteComite = signal<Set<number>>(new Set());
  readonly idsConComiteRegistrado = signal<Set<number>>(new Set());

  filtroEstado = '';

  abrirModal(id: number): void { this.modalIdConvocatoria.set(id); }

  onModalCerrado(actualizado: boolean): void {
    this.modalIdConvocatoria.set(null);
    if (actualizado) this.loadPage();
  }

  hasRole(role: string): boolean {
    return this.auth.hasAnyRole([role]);
  }

  tienePendiente(idConvocatoria: number): boolean {
    return this.idsPendienteComite().has(idConvocatoria);
  }

  comiteRegistrado(idConvocatoria: number): boolean {
    return this.idsConComiteRegistrado().has(idConvocatoria);
  }

  ngOnInit(): void {
    this.loadPage();
    if (this.hasRole('ROLE_COMITE')) {
      this.loadPendientesComite();
    }
  }

  private loadPendientesComite(): void {
    this.notificacionService
      .listar({ page: 0, size: 100, sort: 'fechaCreacion,desc' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const notifs = response.data.content.filter(n => n.idConvocatoria != null);
          this.idsConComiteRegistrado.set(
            new Set<number>(notifs.map(n => n.idConvocatoria as number))
          );
          this.idsPendienteComite.set(
            new Set<number>(notifs.filter(n => n.estado === 'ENVIADA').map(n => n.idConvocatoria as number))
          );
        },
        error: () => { /* silencioso */ },
      });
  }

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
