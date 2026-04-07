import { Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
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
          <select
            [ngModel]="filtroEstado()"
            (ngModelChange)="onFiltroEstado($event)"
            class="input-field w-40"
            aria-label="Filtrar por estado">
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="VALIDADO">Validado</option>
            <option value="APROBADO">Aprobado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </div>
        <div class="flex-1">
          <label class="label-field">Buscar</label>
          <input
            [ngModel]="filtroTexto()"
            (ngModelChange)="onFiltroTexto($event)"
            class="input-field"
            placeholder="Buscar por denominación o nombre..."
            aria-label="Buscar perfil" />
        </div>
      </div>

      <div class="bg-white rounded-lg shadow border overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-[#1F2133] text-white">
              <th class="px-2 py-1 text-left font-semibold">ID</th>
              <th class="px-2 py-1 text-left font-semibold">Denominación del Puesto</th>
              <th class="px-2 py-1 text-left font-semibold">Nombre del Puesto</th>
              <th class="px-2 py-1 text-left font-semibold">Unidad Orgánica</th>
              <th class="px-1 py-1 text-center font-semibold w-10">Ptos.</th>
              <th class="px-2 py-1 text-center font-semibold">Estado</th>
              <th class="px-2 py-1 text-left font-semibold">Observaciones</th>
              <th class="px-2 py-1 text-center font-semibold">Fecha</th>
              <th class="px-2 py-1 text-center font-semibold">{{ canVerPerfilPuesto() ? 'Ver Perfil' : 'Editar' }}</th>
              @if (canVerValidar()) {
                <th class="px-2 py-1 text-center font-semibold">Validar</th>
              }
              <th class="px-2 py-1 text-center font-semibold">Req.</th>
              <th class="px-2 py-1 text-center font-semibold">PDF</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td [attr.colspan]="canVerValidar() ? 12 : 11" class="px-2 py-8 text-center text-gray-400">
                <span class="animate-spin inline-block mr-2">⟳</span> Cargando perfiles...
              </td></tr>
            } @else if (perfiles().length === 0) {
              <tr><td [attr.colspan]="canVerValidar() ? 12 : 11" class="px-2 py-8 text-center text-gray-400">
                No se encontraron perfiles de puesto.
              </td></tr>
            } @else {
              @for (p of perfiles(); track p.idPerfilPuesto) {
                <tr class="border-t hover:bg-gray-50 transition-colors">
                  <td class="px-2 py-1 font-mono text-gray-500">{{ p.idPerfilPuesto }}</td>
                  <td class="px-2 py-1 font-medium text-gray-800">{{ p.denominacionPuesto }}</td>
                  <td class="px-2 py-1 text-gray-600">{{ p.nombrePuesto || '—' }}</td>
                  <td class="px-2 py-1 text-gray-600">{{ p.unidadOrganica }}</td>
                  <td class="px-1 py-1 text-center w-10">{{ p.cantidadPuestos }}</td>
                  <td class="px-2 py-1 text-center">
                    <app-status-badge [estado]="p.estado" [label]="p.estado" />
                  </td>
                  <td class="px-2 py-1 text-left text-gray-500 max-w-[150px] break-words whitespace-normal">{{ p.observaciones || '—' }}</td>
                  <td class="px-2 py-1 text-center text-gray-500">{{ p.fechaCreacion | datePeru }}</td>
                  <!-- Columna: Editar / Ver Perfil Puesto -->
                  <td class="px-2 py-1 text-center">
                    @if (canVerPerfilPuesto()) {
                      <a [routerLink]="['/sistema/requerimiento/perfil', p.idPerfilPuesto, 'ver']"
                        class="btn-ghost text-xs" title="Ver Perfil Puesto">👁️</a>
                    } @else if (canEditarPerfil()) {
                      <a [routerLink]="['/sistema/requerimiento/perfil', p.idPerfilPuesto]"
                        class="btn-ghost text-xs" title="Editar">✏️</a>
                    }
                  </td>
                  <!-- Columna: Validar/Aprobar (solo ORH/ADMIN) -->
                  @if (canVerValidar()) {
                    <td class="px-2 py-1 text-center">
                      @if (p.estado === 'PENDIENTE') {
                        <a [routerLink]="['/sistema/requerimiento/perfil', p.idPerfilPuesto, 'validar']"
                          class="btn-ghost text-xs" title="Validar">🔍</a>
                      }
                      @if (p.estado === 'VALIDADO') {
                        <a [routerLink]="['/sistema/requerimiento/perfil', p.idPerfilPuesto, 'validar']"
                          class="btn-ghost text-xs" title="Aprobar">✅</a>
                      }
                    </td>
                  }
                  <!-- Columna: Crear Requerimiento -->
                  <td class="px-2 py-1 text-center">
                    @if (canCrearRequerimiento() && p.estado === 'APROBADO' && !p.tieneRequerimientoAsociado) {
                      <a [routerLink]="['/sistema/requerimiento/nuevo']"
                         [queryParams]="{ idPerfilPuesto: p.idPerfilPuesto }"
                         class="btn-ghost text-xs"
                         title="Crear requerimiento">📝</a>
                    }
                    @if (canCrearRequerimiento() && p.estado === 'APROBADO' && p.tieneRequerimientoAsociado) {
                      <span class="px-1 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500"
                            [title]="'Ya existe requerimiento asociado' + (p.estadoRequerimientoAsociado ? ': ' + p.estadoRequerimientoAsociado : '')">
                        Req. creado
                      </span>
                    }
                  </td>
                  <!-- Columna: Ver Perfil PDF -->
                  <td class="px-2 py-1 text-center">
                    @if (canVerPdf()) {
                      <a [routerLink]="['/sistema/requerimiento/perfil', p.idPerfilPuesto, 'pdf']"
                        class="btn-ghost text-xs" title="Ver PDF">📄</a>
                    }
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
export class PerfilListComponent {
  private readonly svc        = inject(PerfilPuestoService);
  private readonly auth       = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Permisos ─────────────────────────────────────────────────────────────
  readonly canCrearPerfil         = computed(() => this.auth.hasAnyRole(['ROLE_AREA_SOLICITANTE', 'ROLE_ADMIN']));
  readonly canEditarPerfil        = computed(() => this.auth.hasAnyRole(['ROLE_AREA_SOLICITANTE', 'ROLE_ADMIN']) && !this.auth.hasRole('ROLE_ORH'));
  readonly canVerPerfilPuesto     = computed(() => this.auth.hasRole('ROLE_ORH'));
  readonly canCrearRequerimiento  = computed(() => this.auth.hasAnyRole(['ROLE_AREA_SOLICITANTE', 'ROLE_ADMIN']));
  readonly canVerValidar          = computed(() => this.auth.hasAnyRole(['ROLE_ORH', 'ROLE_ADMIN']));
  readonly canVerAprobar          = computed(() => this.auth.hasAnyRole(['ROLE_ORH', 'ROLE_ADMIN']));
  readonly canVerPdf              = computed(() => this.auth.hasAnyRole(['ROLE_ORH', 'ROLE_AREA_SOLICITANTE', 'ROLE_ADMIN']));

  // ── Estado de la lista ───────────────────────────────────────────────────
  readonly perfiles        = signal<PerfilPuestoResponse[]>([]);
  readonly loading         = signal(false);
  readonly currentPage     = signal(0);
  readonly totalPages      = signal(0);
  readonly totalElements   = signal(0);
  readonly pendientesRequerimiento   = signal(0);
  readonly pendientesValidarAprobar  = signal(0);

  // ── Filtros — signals para reactividad correcta en OnPush ────────────────
  readonly filtroEstado = signal('');
  readonly filtroTexto  = signal('');

  /** Subject para debounce del filtro de texto — evita HTTP en cada tecla */
  private readonly textoBusqueda$ = new Subject<string>();

  constructor() {
    // Debounce 300ms para texto — SRP: solo gestiona el flujo de búsqueda
    this.textoBusqueda$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarLista());

    // Contadores se cargan UNA sola vez al iniciar — SRP: independientes del filtro
    this.cargarContadores();
    this.cargarLista();
  }

  // ── Handlers de filtros ──────────────────────────────────────────────────

  /** SRP: solo gestiona cambio de estado — resetea página y recarga lista */
  onFiltroEstado(valor: string): void {
    this.filtroEstado.set(valor);
    this.currentPage.set(0);
    this.cargarLista();
  }

  /** SRP: solo gestiona cambio de texto — alimenta el Subject con debounce */
  onFiltroTexto(valor: string): void {
    this.filtroTexto.set(valor);
    this.currentPage.set(0);
    this.textoBusqueda$.next(valor);
  }

  // ── Paginación ───────────────────────────────────────────────────────────

  prevPage(): void {
    this.currentPage.update(p => Math.max(0, p - 1));
    this.cargarLista();
  }

  nextPage(): void {
    this.currentPage.update(p => p + 1);
    this.cargarLista();
  }

  // ── Privados (SRP: cada método una sola responsabilidad) ─────────────────

  /** SRP: solo carga la lista paginada con los filtros activos */
  private cargarLista(): void {
    this.loading.set(true);
    const filtros: Record<string, string> = {};
    if (this.filtroEstado()) filtros['estado'] = this.filtroEstado();

    this.svc.listar({ page: this.currentPage(), size: 10, sort: 'fechaCreacion,desc' }, filtros)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<Page<PerfilPuestoResponse>>) => {
          const texto = this.filtroTexto().trim().toLowerCase();
          const content = texto
            ? res.data.content.filter(p =>
                (p.denominacionPuesto?.toLowerCase().includes(texto)) ||
                (p.nombrePuesto?.toLowerCase().includes(texto))
              )
            : res.data.content;
          this.perfiles.set(content);
          this.totalPages.set(res.data.totalPages);
          this.totalElements.set(res.data.totalElements);
          this.loading.set(false);
        },
        error: () => { this.perfiles.set([]); this.loading.set(false); },
      });
  }

  /** SRP: solo carga los contadores de alertas — se llama una vez al iniciar */
  private cargarContadores(): void {
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
}
