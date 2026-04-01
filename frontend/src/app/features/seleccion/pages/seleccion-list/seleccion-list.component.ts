import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/http/api.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { ConvocatoriaSeleccionItem } from '../../models/seleccion.model';
import { Page } from '@shared/models/pagination.model';
import { ApiResponse } from '@shared/models/api-response.model';

interface AvisoNotificacion {
  idNotificacion: number;
  tipoNotificacion: string;
  asunto: string;
  idConvocatoria?: number | null;
  numeroConvocatoria?: string | null;
}

/**
 * FIX BUG-2:
 * El filtro default era 'EN_SELECCION', pero las convocatorias recién
 * publicadas están en 'PUBLICADA'. La transición PUBLICADA → EN_SELECCION
 * la realiza automáticamente el backend al ejecutar E20 (filtroRequisitos).
 * Por eso el módulo Selección DEBE mostrar convocatorias PUBLICADAS también
 * como punto de entrada — el ORH inicia el proceso desde aquí.
 */
@Component({
  selector: 'app-seleccion-list',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeaderComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Selección CAS"
        subtitle="M03 — Evaluación, cuadro de méritos y publicación de resultados">
      </app-page-header>

      <!-- Filtro de estado -->
      <div class="card flex flex-wrap items-end gap-3">
        <div>
          <label class="label-field">Estado</label>
          <select
            [(ngModel)]="filtroEstado"
            (ngModelChange)="cargar()"
            class="input-field w-48"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos (activos)</option>
            <option value="PUBLICADA">Publicada — pendiente iniciar</option>
            <option value="EN_SELECCION">En Selección — en evaluación</option>
            <option value="FINALIZADA">Finalizada</option>
          </select>
        </div>
        <p class="text-xs text-gray-400 self-end pb-1">
          {{ convocatorias().length }} convocatoria(s) encontrada(s)
        </p>
      </div>

      <!-- Avisos COMITÉ: postulantes APTO listos para Evaluación Curricular E24 -->
      @if (esComite()) {
        @for (c of convocatorias(); track c.idConvocatoria) {
          @if (c.estado === 'EN_SELECCION' && c.postulantesVerificados && c.postulantesVerificados > 0 && !c.resultadosCurricularPublicados) {
            <div class="flex items-start gap-2 bg-blue-50 border border-blue-300 rounded-md px-3 py-2 text-xs text-blue-800">
              <span class="mt-0.5">🔔</span>
              <span>
                La <strong>{{ c.numeroConvocatoria }}</strong> tiene
                <strong>{{ c.postulantesVerificados }}</strong>
                postulante(s) verificado(s) por ORH listos para su Evaluación Curricular (E24).
              </span>
            </div>
          }
        }
      }

      <!-- Avisos ORH: postulantes APTOS listos para Códigos Anónimos E25 -->
      @if (esOrh()) {
        @for (c of convocatorias(); track c.idConvocatoria) {
          @if (c.estado === 'EN_SELECCION' && c.postulantesAptos && c.postulantesAptos > 0 && !c.notificacionCodigosEnviada) {
            <div class="flex items-start gap-2 bg-green-50 border border-green-300 rounded-md px-3 py-2 text-xs text-green-800">
              <span class="mt-0.5">✅</span>
              <span>
                <strong>{{ c.numeroConvocatoria }}</strong> tiene
                <strong>{{ c.postulantesAptos }}</strong>
                postulante(s) con Evaluación Curricular APTOS para asignar Código Anónimo
                (D.L. 1451 Art. 6).
              </span>
            </div>
          }
        }
      }

      <!-- Avisos ORH: entrevista lista — proceder con E28 Bonificaciones -->
      @if (esOrh()) {
        @for (c of convocatorias(); track c.idConvocatoria) {
          @if (c.notificacionEntrevistaEnviada && c.estado !== 'FINALIZADA') {
            <div class="flex items-start gap-2 bg-purple-50 border border-purple-300 rounded-md px-3 py-2 text-xs text-purple-800">
              <span class="mt-0.5">📨</span>
              <span>
                El COMITÉ notificó que la Entrevista Personal de
                <strong>{{ c.numeroConvocatoria }}</strong>
                está lista. Proceda con <strong>Bonificaciones → Publicar Resultados</strong>.
              </span>
            </div>
          }
        }
      }

      <!-- Avisos ORH: postulantes pendientes de verificar E19 -->
      @for (c of convocatorias(); track c.idConvocatoria) {
        @if (c.estado === 'PUBLICADA' && c.postulantesRegistrados && c.postulantesRegistrados > 0) {
          <div class="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-md px-3 py-2 text-xs text-amber-800">
            <span class="mt-0.5">⚠</span>
            <span>
              La <strong>{{ c.numeroConvocatoria }}</strong> tiene
              <strong>{{ c.postulantesRegistrados }}</strong>
              postulante(s) por verificar (D.L. 1451 — E19).
            </span>
          </div>
        }
      }

      <!-- Tabla -->
      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#1F2133] text-white">
              <th class="px-3 py-2 text-left text-xs font-semibold">N° Convocatoria</th>
              <th class="px-3 py-2 text-left text-xs font-semibold">Puesto</th>
              <th class="px-3 py-2 text-left text-xs font-semibold">Oficina</th>
              <th class="px-3 py-2 text-center text-xs font-semibold">Estado</th>
              <th class="px-3 py-2 text-center text-xs font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="5" class="px-3 py-10 text-center text-gray-400 text-sm">
                  <span class="animate-spin inline-block mr-2">⟳</span> Cargando...
                </td>
              </tr>
            } @else if (convocatorias().length === 0) {
              <tr>
                <td colspan="5" class="px-3 py-10 text-center text-sm">
                  <p class="text-gray-400">No se encontraron convocatorias.</p>
                  @if (filtroEstado === 'EN_SELECCION') {
                    <p class="text-xs text-amber-600 mt-2">
                      ⚠ Cambie el filtro a <strong>"Publicada"</strong> para ver convocatorias
                      cuyo proceso de selección aún no se ha iniciado (E20 pendiente).
                    </p>
                  }
                </td>
              </tr>
            } @else {
              @for (c of convocatorias(); track c.idConvocatoria) {
                <tr class="border-t hover:bg-gray-50 transition-colors"
                    [class.bg-purple-50]="c.notificacionEntrevistaEnviada && esOrh()">
                  <td class="px-3 py-2 font-mono text-xs font-semibold text-[#1F2133]">
                    {{ c.numeroConvocatoria }}
                  </td>
                  <td class="px-3 py-2 text-xs">
                    <span>{{ c.nombrePuesto || c.descripcion || '—' }}</span>
                    @if (avisosPorConv().get(c.idConvocatoria); as aviso) {
                      <div class="flex items-center gap-1 mt-1">
                        <span class="text-amber-500 text-xs">🔔</span>
                        <span class="text-xs text-amber-700 font-medium italic">
                          {{ aviso.asunto }}
                        </span>
                        <button
                          (click)="descartarAviso(aviso); $event.stopPropagation()"
                          class="ml-1 text-amber-400 hover:text-amber-700 text-xs leading-none"
                          title="Descartar aviso"
                        >✕</button>
                      </div>
                    }
                  </td>
                  <td class="px-3 py-2 text-xs uppercase text-gray-500">
                    {{ c.unidadOrganica || '—' }}
                  </td>
                  <td class="px-3 py-2 text-center">
                    <app-status-badge [estado]="c.estado" [label]="c.estado" />
                  </td>
                  <td class="px-3 py-2 text-center">
                    <a
                      [routerLink]="['/sistema/seleccion', c.idConvocatoria, 'postulantes']"
                      class="text-xs px-3 py-1 rounded font-semibold transition-colors inline-block"
                      [class]="c.estado === 'PUBLICADA'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : c.estado === 'EN_SELECCION'
                        ? 'bg-[#1E3A5F] hover:bg-[#2D5F8A] text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'"
                    >
                      {{ c.estado === 'PUBLICADA' ? 'Ver Postulantes →'
                         : c.estado === 'EN_SELECCION' ? 'Continuar →'
                         : 'Ver resultados' }}
                    </a>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class SeleccionListComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly esComite = computed(() => this.auth.hasRole('ROLE_COMITE'));
  readonly esOrh    = computed(() => this.auth.hasRole('ROLE_ORH'));

  readonly loading = signal(false);
  readonly convocatorias = signal<ConvocatoriaSeleccionItem[]>([]);
  readonly avisos = signal<AvisoNotificacion[]>([]);

  /** Mapa O(1): idConvocatoria → AvisoNotificacion (solo CODIGOS_LISTOS sin descartar) */
  readonly avisosPorConv = computed(() => {
    const map = new Map<number, AvisoNotificacion>();
    for (const a of this.avisos()) {
      if (a.idConvocatoria != null) map.set(a.idConvocatoria, a);
    }
    return map;
  });

  filtroEstado = '';

  constructor() {
    this.cargar();
    this.cargarAvisos();
  }

  cargar(): void {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.filtroEstado) params['estado'] = this.filtroEstado;

    this.api
      .getPage<ConvocatoriaSeleccionItem>(
        '/convocatorias',
        { page: 0, size: 100, sort: 'fechaPublicacion,desc' },
        params,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const lista = res.data?.content ?? [];
          this.convocatorias.set(
            this.filtroEstado
              ? lista
              : lista.filter((c) =>
                  ['PUBLICADA', 'EN_SELECCION', 'FINALIZADA'].includes(c.estado),
                ),
          );
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private cargarAvisos(): void {
    this.api
      .getPage<AvisoNotificacion>(
        '/notificaciones',
        { page: 0, size: 50, sort: 'fechaCreacion,desc' },
        { estado: 'ENVIADA' },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<Page<AvisoNotificacion>>) => {
          this.avisos.set(
            (res.data?.content ?? []).filter((n) => n.tipoNotificacion === 'CODIGOS_LISTOS'),
          );
        },
        error: (err: unknown) => { console.error('[seleccion-list] Error al cargar avisos:', err); },
      });
  }

  descartarAviso(aviso: AvisoNotificacion): void {
    this.avisos.update((list) => list.filter((a) => a.idNotificacion !== aviso.idNotificacion));
    this.api
      .patch<AvisoNotificacion>(`/notificaciones/${aviso.idNotificacion}/marcar-leida`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => { /* silencioso */ } });
  }
}
