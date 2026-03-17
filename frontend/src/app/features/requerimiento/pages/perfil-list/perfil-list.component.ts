import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PerfilPuestoService } from '../../services/perfil-puesto.service';
import { PerfilPuestoResponse } from '../../models/perfil-puesto.model';
import { ApiResponse } from '@shared/models/api-response.model';
import { Page } from '@shared/models/pagination.model';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { DatePeruPipe } from '@shared/pipes/date-peru.pipe';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-perfil-list',
  standalone: true,
  imports: [RouterLink, FormsModule, StatusBadgeComponent, DatePeruPipe, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header title="Perfiles de Puesto" subtitle="Listado de perfiles CAS — RPE 065-2020-SERVIR">
        <div class="flex items-center gap-2">
          @if (canCrearRequerimiento()) {
            <a routerLink="/sistema/requerimiento/nuevo" class="btn-ghost">+ Nuevo Requerimiento</a>
          }
          @if (canCrearPerfil()) {
            <a routerLink="/sistema/requerimiento/perfil/nuevo" class="btn-primary">+ Nuevo Perfil</a>
          }
        </div>
      </app-page-header>

      @if (canCrearRequerimiento() && pendientesRequerimiento() > 0) {
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
             role="status"
             aria-live="polite"
             [attr.aria-label]="'Hay ' + pendientesRequerimiento() + ' perfiles aprobados pendientes de requerimiento'">
          <span class="font-medium">Hay {{ pendientesRequerimiento() }} perfil{{ pendientesRequerimiento() !== 1 ? 'es' : '' }} aprobado{{ pendientesRequerimiento() !== 1 ? 's' : '' }} pendiente{{ pendientesRequerimiento() !== 1 ? 's' : '' }} de requerimiento.</span>
          <a routerLink="/sistema/requerimiento/nuevo" class="ml-2 underline hover:no-underline">Crear requerimiento</a>
        </div>
      }

      @if ((canVerValidar() || canVerAprobar()) && pendientesValidarAprobar() > 0) {
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
             role="status"
             aria-live="polite"
             [attr.aria-label]="'Tienes ' + pendientesValidarAprobar() + ' perfiles de puestos por validar y aprobar'">
          <span class="font-medium">Tienes {{ pendientesValidarAprobar() }} Perfil{{ pendientesValidarAprobar() !== 1 ? 'es' : '' }} de Puesto{{ pendientesValidarAprobar() !== 1 ? 's' : '' }} por Validar y Aprobar</span>
        </div>
      }

      <div class="card flex items-center gap-3 flex-wrap">
        <div>
          <label class="label-field">Estado</label>
          <select [(ngModel)]="filtroEstado" (ngModelChange)="cargar()" class="input-field w-40" aria-label="Filtrar por estado">
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="VALIDADO">Validado</option>
            <option value="APROBADO">Aprobado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </div>
        <div class="flex-1">
          <label class="label-field">Buscar</label>
          <input [(ngModel)]="filtroTexto" (input)="cargar()" class="input-field" placeholder="Buscar por denominación o nombre..." aria-label="Buscar perfil" />
        </div>
      </div>

      <div class="bg-white rounded-lg shadow border overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#1F2133] text-white">
              <th class="px-3 py-2 text-left font-semibold text-xs">ID</th>
              <th class="px-3 py-2 text-left font-semibold text-xs">Denominación del Puesto</th>
              <th class="px-3 py-2 text-left font-semibold text-xs">Nombre del Puesto</th>
              <th class="px-3 py-2 text-left font-semibold text-xs">Unidad Orgánica</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Puestos</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Estado</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Fecha</th>
              <th class="px-3 py-2 text-center font-semibold text-xs">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="8" class="px-3 py-8 text-center text-gray-400 text-sm">
                <span class="animate-spin inline-block mr-2">⟳</span> Cargando perfiles...
              </td></tr>
            } @else if (perfiles().length === 0) {
              <tr><td colspan="8" class="px-3 py-8 text-center text-gray-400 text-sm">
                No se encontraron perfiles de puesto.
              </td></tr>
            } @else {
              @for (p of perfiles(); track p.idPerfilPuesto) {
                <tr class="border-t hover:bg-gray-50 transition-colors">
                  <td class="px-3 py-2 font-mono text-xs text-gray-500">{{ p.idPerfilPuesto }}</td>
                  <td class="px-3 py-2 font-medium text-gray-800 text-sm">{{ p.denominacionPuesto }}</td>
                  <td class="px-3 py-2 text-gray-600 text-sm">{{ p.nombrePuesto || '—' }}</td>
                  <td class="px-3 py-2 text-gray-600 text-sm">{{ p.unidadOrganica }}</td>
                  <td class="px-3 py-2 text-center text-sm">{{ p.cantidadPuestos }}</td>
                  <td class="px-3 py-2 text-center">
                    <app-status-badge [estado]="p.estado" [label]="p.estado" />
                  </td>
                  <td class="px-3 py-2 text-center text-xs text-gray-500">{{ p.fechaCreacion | datePeru }}</td>
                  <td class="px-3 py-2 text-center">
                    <div class="flex justify-center gap-1 flex-wrap">
                      @if (canEditarPerfil()) {
                        <a [routerLink]="['/sistema/requerimiento/perfil', p.idPerfilPuesto]"
                          class="btn-ghost text-xs" title="Editar">✏️</a>
                      }

                      @if (p.estado === 'PENDIENTE' && canVerValidar()) {
                        <a [routerLink]="['/sistema/requerimiento/perfil', p.idPerfilPuesto, 'validar']"
                          class="btn-ghost text-xs" title="Validar">🔍</a>
                      }

                      @if (p.estado === 'VALIDADO' && canVerAprobar()) {
                        <a [routerLink]="['/sistema/requerimiento/perfil', p.idPerfilPuesto, 'validar']"
                          class="btn-ghost text-xs" title="Aprobar">✅</a>
                      }

                      @if (canCrearRequerimiento() && p.estado === 'APROBADO' && !p.tieneRequerimientoAsociado) {
                        <a [routerLink]="['/sistema/requerimiento/nuevo']"
                           [queryParams]="{ idPerfilPuesto: p.idPerfilPuesto }"
                           class="btn-ghost text-xs"
                           title="Crear requerimiento">📝</a>
                      }

                      @if (canCrearRequerimiento() && p.estado === 'APROBADO' && p.tieneRequerimientoAsociado) {
                        <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500"
                              [title]="'Ya existe requerimiento asociado' + (p.estadoRequerimientoAsociado ? ': ' + p.estadoRequerimientoAsociado : '')">
                          Req. creado
                        </span>
                      }

                      @if (canVerPdf()) {
                        <a [routerLink]="['/sistema/requerimiento/perfil', p.idPerfilPuesto, 'pdf']"
                          class="btn-ghost text-xs" title="Ver PDF">📄</a>
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
            <span class="text-gray-500">Página {{ currentPage() + 1 }} de {{ totalPages() }} · {{ totalElements() }} registros</span>
            <div class="flex gap-1">
              <button (click)="prevPage()" [disabled]="currentPage() === 0" class="px-2 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-40">← Anterior</button>
              <button (click)="nextPage()" [disabled]="currentPage() >= totalPages() - 1" class="px-2 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-40">Siguiente →</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PerfilListComponent implements OnInit {
  private svc = inject(PerfilPuestoService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  readonly canCrearPerfil = computed(() => this.auth.hasAnyRole(['ROLE_AREA_SOLICITANTE', 'ROLE_ADMIN']));
  readonly canEditarPerfil = computed(() => this.auth.hasAnyRole(['ROLE_AREA_SOLICITANTE', 'ROLE_ADMIN']));
  readonly canCrearRequerimiento = computed(() => this.auth.hasAnyRole(['ROLE_AREA_SOLICITANTE', 'ROLE_ADMIN']));
  readonly canVerValidar = computed(() => this.auth.hasAnyRole(['ROLE_ORH', 'ROLE_ADMIN']));
  readonly canVerAprobar = computed(() => this.auth.hasAnyRole(['ROLE_ORH', 'ROLE_ADMIN']));
  readonly canVerPdf = computed(() => this.auth.hasAnyRole(['ROLE_ORH', 'ROLE_AREA_SOLICITANTE', 'ROLE_ADMIN']));

  perfiles = signal<PerfilPuestoResponse[]>([]);
  loading = signal(false);
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  pendientesRequerimiento = signal(0);
  pendientesValidarAprobar = signal(0);
  filtroEstado = '';
  filtroTexto = '';

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    const filtros: Record<string, string> = {};
    if (this.filtroEstado) filtros['estado'] = this.filtroEstado;

    this.svc.listar({ page: this.currentPage(), size: 10, sort: 'fechaCreacion,desc' }, filtros)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<Page<PerfilPuestoResponse>>) => {
          const texto = this.filtroTexto.trim().toLowerCase();
          const content = res.data.content.filter(p =>
            !texto
            || (p.denominacionPuesto?.toLowerCase().includes(texto))
            || (p.nombrePuesto?.toLowerCase().includes(texto))
          );
          this.perfiles.set(content);
          this.totalPages.set(res.data.totalPages);
          this.totalElements.set(res.data.totalElements);
          this.loading.set(false);
        },
        error: () => {
          this.perfiles.set([]);
          this.loading.set(false);
        },
      });

    this.svc.contarPendientesRequerimiento()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<number>) => this.pendientesRequerimiento.set(res.data ?? 0),
        error: () => this.pendientesRequerimiento.set(0),
      });

    if (this.canVerValidar() || this.canVerAprobar()) {
      this.svc.contarPendientesValidarAprobar()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res: ApiResponse<number>) => this.pendientesValidarAprobar.set(res.data ?? 0),
          error: () => this.pendientesValidarAprobar.set(0),
        });
    }
  }

  prevPage(): void {
    this.currentPage.update(p => Math.max(0, p - 1));
    this.cargar();
  }

  nextPage(): void {
    this.currentPage.update(p => p + 1);
    this.cargar();
  }
}
