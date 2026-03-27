import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';     // ← FIX: pipe 'slice'
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { TachaResponse, ResolverTachaRequest } from '../../models/seleccion.model';

interface ResolucionPendiente {
  idTacha: number;
  decision: 'FUNDADA' | 'INFUNDADA' | '';
  motivoResolucion: string;
}

@Component({
  selector: 'app-tacha-resolver',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeaderComponent, SlicePipe],  // ← FIX
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Resolución de Tachas"
        subtitle="E22 · RF-12 · ORH resuelve tachas dentro del período de 24 horas">
        <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']" class="btn-ghost text-sm">← Postulantes</a>
      </app-page-header>

      <!-- Info legal -->
      <div class="card bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <p class="font-semibold">⚖️ Período de Tachas — RF-12</p>
        <p class="mt-1">Las tachas deben resolverse dentro del período establecido en el cronograma.
          Una tacha <strong>FUNDADA</strong> descalifica al postulante;
          una tacha <strong>INFUNDADA</strong> mantiene al postulante en el proceso.</p>
      </div>

      @if (loading()) {
        <div class="card py-10 text-center text-gray-400">
          <span class="animate-spin inline-block mr-2">⟳</span> Cargando tachas...
        </div>
      } @else if (tachas().length === 0) {
        <div class="card py-10 text-center">
          <p class="text-gray-400 text-sm">No hay tachas registradas para esta convocatoria.</p>
          <a [routerLink]="['/sistema/seleccion', idConv, 'eval-curricular']"
             class="btn-primary text-sm mt-4 inline-block">
            Continuar a Evaluación Curricular →
          </a>
        </div>
      } @else {
        <div class="space-y-4">
          @for (tacha of tachas(); track tacha.idTacha) {
            <div
              class="card border-l-4"
              [class.border-yellow-400]="tacha.estado === 'PENDIENTE'"
              [class.border-red-500]="tacha.estado === 'FUNDADA'"
              [class.border-green-500]="tacha.estado === 'INFUNDADA'"
            >
              <!-- Cabecera -->
              <div class="flex items-start justify-between mb-3">
                <div>
                  <p class="font-semibold text-sm">{{ tacha.nombrePostulante }}</p>
                  <p class="text-xs text-gray-500">
                    Tacha N° {{ tacha.idTacha }} · {{ tacha.fechaRegistro | slice:0:10 }}
                  </p>
                </div>
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-semibold"
                  [class]="tacha.estado === 'PENDIENTE'
                    ? 'bg-yellow-100 text-yellow-800'
                    : tacha.estado === 'FUNDADA'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'"
                >
                  {{ tacha.estado }}
                </span>
              </div>

              <!-- Motivo -->
              <div class="bg-gray-50 rounded p-3 text-sm mb-3">
                <p class="font-medium text-xs text-gray-500 mb-1">MOTIVO DE LA TACHA:</p>
                <p>{{ tacha.motivo }}</p>
                @if (tacha.descripcion) {
                  <p class="text-xs text-gray-500 mt-1">{{ tacha.descripcion }}</p>
                }
              </div>

              <!-- Resolución inline (solo PENDIENTE) -->
              @if (tacha.estado === 'PENDIENTE') {
                <div class="border-t pt-3 space-y-3">
                  <p class="text-xs font-semibold text-gray-600">RESOLUCIÓN ORH:</p>
                  <div class="flex gap-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        [name]="'decision-' + tacha.idTacha"
                        value="FUNDADA"
                        [(ngModel)]="resoluciones[tacha.idTacha].decision"
                      />
                      <span class="text-sm font-medium text-red-700">FUNDADA</span>
                      <span class="text-xs text-gray-400">(descalifica)</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        [name]="'decision-' + tacha.idTacha"
                        value="INFUNDADA"
                        [(ngModel)]="resoluciones[tacha.idTacha].decision"
                      />
                      <span class="text-sm font-medium text-green-700">INFUNDADA</span>
                      <span class="text-xs text-gray-400">(continúa)</span>
                    </label>
                  </div>
                  <div>
                    <label class="label-field text-xs">
                      Fundamento de la resolución <span class="text-red-500">*</span>
                    </label>
                    <textarea
                      [(ngModel)]="resoluciones[tacha.idTacha].motivoResolucion"
                      rows="2"
                      class="input-field w-full text-sm"
                      placeholder="Ingrese el fundamento legal o técnico..."
                    ></textarea>
                  </div>
                  <div class="flex justify-end">
                    <button
                      (click)="resolver(tacha.idTacha)"
                      [disabled]="!resoluciones[tacha.idTacha].decision
                                  || !resoluciones[tacha.idTacha].motivoResolucion
                                  || resolviendo()"
                      class="btn-primary text-sm"
                    >
                      {{ resolviendo() ? 'Guardando...' : 'Resolver Tacha' }}
                    </button>
                  </div>
                </div>
              } @else {
                <!-- Ya resuelta -->
                <div class="border-t pt-3 space-y-1">
                  <p class="text-xs text-gray-500">
                    Resolución: <strong>{{ tacha.decision }}</strong>
                  </p>
                  <p class="text-xs text-gray-500">{{ tacha.motivoResolucion }}</p>
                  @if (tacha.fechaResolucion) {
                    <p class="text-xs text-gray-400">{{ tacha.fechaResolucion | slice:0:10 }}</p>
                  }
                </div>
              }
            </div>
          }

          <div class="flex justify-end">
            <a [routerLink]="['/sistema/seleccion', idConv, 'eval-curricular']"
               class="btn-primary text-sm">
              Continuar a Evaluación Curricular →
            </a>
          </div>
        </div>
      }
    </div>
  `,
})
export class TachaResolverComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly tachas = signal<TachaResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly resolviendo = signal(false);

  protected readonly resoluciones: Record<number, ResolucionPendiente> = {};

  constructor() {
    this.cargarTachas();
  }

  private cargarTachas(): void {
    this.svc
      .listarTachas(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.tachas.set(lista);
          lista.forEach((t) => {
            this.resoluciones[t.idTacha] = {
              idTacha: t.idTacha,
              decision: '',
              motivoResolucion: '',
            };
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Error al cargar las tachas.');
        },
      });
  }

  protected resolver(idTacha: number): void {
    const res = this.resoluciones[idTacha];
    if (!res.decision || !res.motivoResolucion.trim()) return;

    const req: ResolverTachaRequest = {
      decision: res.decision as 'FUNDADA' | 'INFUNDADA',
      motivoResolucion: res.motivoResolucion.trim(),
    };

    this.resolviendo.set(true);
    this.svc
      .resolverTacha(idTacha, req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.tachas.update((list) =>
            list.map((t) => (t.idTacha === idTacha ? updated : t)),
          );
          this.resolviendo.set(false);
          this.toast.success(`Tacha ${updated.decision} correctamente.`);
        },
        error: () => {
          this.resolviendo.set(false);
          this.toast.error('Error al resolver la tacha.');
        },
      });
  }
}
