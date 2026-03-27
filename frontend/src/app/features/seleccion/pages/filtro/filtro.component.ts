import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { PostulacionSeleccion } from '../../models/seleccion.model';

/**
 * E20 — Filtro Requisitos Mínimos RF-07.
 *
 * Nota de implementación:
 * El backend PostulacionService.filtroRequisitos() retorna PostulacionResponse:
 *   { idConvocatoria, estado, mensaje }
 *
 * Los totales (aptos/noAptos) vienen en el campo `mensaje`:
 *   "Filtro completado. Aptos: X, No aptos: Y"
 *
 * Para mostrar el detalle individual de cada postulante, esta pantalla
 * carga la lista de postulantes DESPUÉS de ejecutar el filtro.
 */
@Component({
  selector: 'app-filtro-requisitos',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Filtro de Requisitos Mínimos"
        subtitle="E20 · Motor RF-07 · Masivo · Automático">
        <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
           class="btn-ghost text-sm">← Postulantes</a>
      </app-page-header>

      <!-- Banner informativo RF-07 -->
      <div class="card border-l-4 border-indigo-500 bg-indigo-50 py-3 px-4">
        <p class="text-xs font-semibold text-indigo-800 mb-1">
          ⚙ Motor RF-07 — Filtro Automático de Requisitos Mínimos
        </p>
        <p class="text-xs text-indigo-700">
          Compara automáticamente los datos del perfil atómico (RPE 065-2020-SERVIR) contra
          los datos de cada postulante. Los que no cumplen los requisitos mínimos
          pasan a estado <strong>NO_APTO</strong>. Los que cumplen pasan a <strong>VERIFICADO</strong>.
          Al ejecutar, la convocatoria transiciona a <strong>EN_SELECCION</strong>.
        </p>
      </div>

      @if (!ejecutado()) {
        <!-- Panel previo a ejecución -->
        <div class="card space-y-4">
          <div class="bg-amber-50 border border-amber-200 rounded p-3">
            <p class="text-sm font-semibold text-amber-800 mb-1">⚠ Acción masiva</p>
            <p class="text-xs text-amber-700">
              Este proceso afectará a todos los postulantes en estado
              <strong>REGISTRADO</strong> de esta convocatoria.
              La acción es automática e instantánea.
            </p>
          </div>

          <div class="flex gap-2 justify-end">
            <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
               class="btn-ghost">Cancelar</a>
            <button
              (click)="ejecutarFiltro()"
              [disabled]="ejecutando()"
              class="btn-primary disabled:opacity-50"
            >
              {{ ejecutando() ? '⟳ Ejecutando filtro...' : 'Ejecutar Filtro RF-07 (E20)' }}
            </button>
          </div>
        </div>

      } @else {
        <!-- Resultado de la ejecución -->
        <div class="card border border-green-300 bg-green-50 p-4 space-y-1">
          <p class="font-semibold text-green-700 text-sm">✓ Filtro ejecutado correctamente</p>
          <p class="text-xs text-gray-600">{{ mensajeResultado() }}</p>
          <p class="text-xs text-blue-700 font-medium">
            Convocatoria → EN_SELECCION
          </p>
        </div>

        <!-- Contadores por estado -->
        @if (contadores().length > 0) {
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            @for (kv of contadores(); track kv.estado) {
              <div class="card text-center border-l-2 py-3"
                   [class]="kv.estado === 'VERIFICADO'
                     ? 'border-green-500'
                     : kv.estado === 'NO_APTO'
                     ? 'border-red-400'
                     : 'border-gray-300'">
                <p class="text-2xl font-bold"
                   [class]="kv.estado === 'VERIFICADO'
                     ? 'text-green-700'
                     : kv.estado === 'NO_APTO'
                     ? 'text-red-600'
                     : 'text-gray-500'">
                  {{ kv.total }}
                </p>
                <p class="text-xs text-gray-500 mt-0.5">{{ kv.estado }}</p>
              </div>
            }
          </div>
        }

        <!-- Tabla de postulantes con nuevo estado -->
        @if (cargandoLista()) {
          <div class="card py-6 text-center text-gray-400 text-sm">
            <span class="animate-spin inline-block mr-2">⟳</span> Cargando resultados...
          </div>
        } @else if (postulantes().length > 0) {
          <div class="card overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-[#1F2133] text-white">
                  <th class="px-3 py-2 text-left font-semibold">#</th>
                  <th class="px-3 py-2 text-left font-semibold">Apellidos y Nombres</th>
                  <th class="px-3 py-2 text-left font-semibold">N° Documento</th>
                  <th class="px-3 py-2 text-center font-semibold">Estado</th>
                  <th class="px-3 py-2 text-center font-semibold">DL1451</th>
                </tr>
              </thead>
              <tbody>
                @for (p of postulantes(); track p.idPostulacion; let i = $index) {
                  <tr class="border-t" [class]="p.estado === 'VERIFICADO'
                    ? 'bg-green-50' : p.estado === 'NO_APTO' ? 'bg-red-50' : ''">
                    <td class="px-3 py-2 text-gray-400">{{ i + 1 }}</td>
                    <td class="px-3 py-2 font-medium">
                      {{ p.postulante.nombreCompleto }}
                    </td>
                    <td class="px-3 py-2 font-mono text-gray-500">
                      {{ p.postulante.numeroDocumento }}
                    </td>
                    <td class="px-3 py-2 text-center">
                      <app-status-badge [estado]="p.estado" [label]="p.estado" />
                    </td>
                    <td class="px-3 py-2 text-center text-xs">
                      @if (p.verificacionRnssc === 'SIN_SANCIONES' && p.verificacionRegiprec === 'SIN_SANCIONES') {
                        <span class="text-green-600">✓ OK</span>
                      } @else if (p.verificacionRnssc === 'CON_SANCIONES' || p.verificacionRegiprec === 'CON_SANCIONES') {
                        <span class="text-red-600">✗ Sancionado</span>
                      } @else {
                        <span class="text-gray-400">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Navegación -->
        <div class="flex gap-2 justify-end">
          <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
             class="btn-primary text-sm">
            ← Ver Postulantes
          </a>
        </div>
      }
    </div>
  `,
})
export class FiltroRequisitosComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly ejecutando = signal(false);
  protected readonly ejecutado = signal(false);
  protected readonly cargandoLista = signal(false);
  protected readonly mensajeResultado = signal('');
  protected readonly postulantes = signal<PostulacionSeleccion[]>([]);

  protected readonly contadores = computed(() => {
    const map = new Map<string, number>();
    for (const p of this.postulantes()) {
      map.set(p.estado, (map.get(p.estado) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([estado, total]) => ({ estado, total }));
  });

  protected ejecutarFiltro(): void {
    this.ejecutando.set(true);

    this.svc
      .filtroRequisitos(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.ejecutando.set(false);
          this.ejecutado.set(true);
          // Backend retorna PostulacionSeleccion con campo mensaje
          this.mensajeResultado.set(
            res.mensaje ?? 'Filtro RF-07 ejecutado. Convocatoria → EN_SELECCION.',
          );
          this.toast.success(res.mensaje ?? 'Filtro ejecutado correctamente.');
          // Cargar lista actualizada para mostrar nuevos estados
          this.cargarPostulantes();
        },
        error: () => {
          this.ejecutando.set(false);
          this.toast.error('Error al ejecutar el filtro de requisitos.');
        },
      });
  }

  private cargarPostulantes(): void {
    this.cargandoLista.set(true);
    this.svc
      .listarPostulantes(this.idConv, 0, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.postulantes.set(page.content ?? []);
          this.cargandoLista.set(false);
        },
        error: () => this.cargandoLista.set(false),
      });
  }
}
