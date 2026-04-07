import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  ExamenPostulanteResponse,
  PreguntaExamenResponse,
} from '../../models/seleccion.model';

@Component({
  selector: 'app-examen-virtual',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }
      .timer-bar {
        background: linear-gradient(90deg, #22c55e 0%, #eab308 70%, #ef4444 100%);
        height: 4px;
        border-radius: 2px;
        transition: width 1s linear;
      }
      .stepper-circle {
        width: 22px; height: 22px; border-radius: 50%; display: inline-flex;
        align-items: center; justify-content: center; font-size: 11px; font-weight: 700;
        border: 2px solid #d1d5db; color: #9ca3af; background: #fff; flex-shrink: 0;
      }
      .stepper-circle--active { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
      .stepper-circle--done { border-color: #22c55e; color: #fff; background: #22c55e; }
      .stepper-circle--pending { border-color: #e5e7eb; color: #d1d5db; }
      .stepper-line {
        flex: 1; height: 2px; background: #e5e7eb; min-width: 12px; max-width: 40px; margin: 0 4px;
      }
      .stepper-line--done { background: #22c55e; }
      .pregunta-progress-fill {
        height: 4px; background: #3b82f6; border-radius: 2px;
        transition: width 0.2s ease-out;
      }
    `,
  ],
  template: `
    <div class="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div class="space-y-4">
      <app-page-header
        title="Examen T\u00e9cnico Virtual"
        subtitle="Responda las preguntas dentro del tiempo establecido">
      </app-page-header>

      @if (loading()) {
        <div class="card py-10 text-center text-gray-400">
          <span class="animate-spin inline-block mr-2 text-xl">\u27f3</span>
          <p class="mt-2 text-sm">Iniciando examen...</p>
        </div>
      } @else if (error()) {
        <div class="card border border-red-200 bg-red-50 p-4">
          <p class="text-sm text-red-700">{{ error() }}</p>
          <a routerLink="/portal/postulaciones"
             class="btn-ghost text-sm mt-2 inline-block">\u2190 Mis Postulaciones</a>
        </div>
      } @else if (finalizado()) {
        <!-- Resultado -->
        <div class="card border border-green-300 bg-green-50 p-4 space-y-2">
          <p class="font-semibold text-green-700 text-sm">
            {{ examen()!.mensaje }}
          </p>
          @if (examen()!.mostrarResultado && examen()!.puntajeTotal != null) {
            <div class="flex flex-wrap gap-6 text-sm">
              <span>Correctas: <strong>{{ examen()!.totalCorrectas }}</strong> / {{ examen()!.totalPreguntas }}</span>
              <span>Puntaje: <strong>{{ examen()!.puntajeTotal }}</strong></span>
            </div>
          } @else {
            <p class="text-xs text-gray-500">
              Los resultados ser\u00e1n publicados por ORH seg\u00fan el cronograma de la convocatoria.
            </p>
          }
        </div>
      } @else if (examen()?.preguntas?.length) {
        <!-- Timer -->
        <div class="card p-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Tiempo restante:</span>
            <span class="font-mono font-bold text-lg"
                  [class.text-red-600]="tiempoRestante() < 120"
                  [class.text-amber-600]="tiempoRestante() >= 120 && tiempoRestante() < 300"
                  [class.text-green-600]="tiempoRestante() >= 300">
              {{ formatTiempo(tiempoRestante()) }}
            </span>
          </div>
          <div class="mt-1 bg-gray-200 rounded-full overflow-hidden">
            <div class="timer-bar"
                 [style.width.%]="porcentajeTiempo()"></div>
          </div>
        </div>

        <!-- Stepper + avance preguntas -->
        <div class="card p-3 space-y-2">
          <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Avance del examen
          </p>
          <div class="overflow-x-auto -mx-1 px-1 pb-1">
            <div class="flex items-center min-w-min gap-0">
              @for (sp of examen()!.preguntas!; track sp.idPregunta; let si = $index) {
                <button
                  type="button"
                  class="p-0 m-0 border-0 bg-transparent cursor-pointer shrink-0
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
                  (click)="irAPaso(si)"
                  [attr.aria-label]="'Ir a pregunta ' + sp.orden + ' de ' + examen()!.totalPreguntas"
                  [attr.aria-current]="si === pasoIndex() ? 'step' : null">
                  <span
                    class="stepper-circle"
                    [class.stepper-circle--active]="si === pasoIndex()"
                    [class.stepper-circle--done]="!!respuestas()[sp.idPregunta] && si !== pasoIndex()"
                    [class.stepper-circle--pending]="!respuestas()[sp.idPregunta] && si !== pasoIndex()">
                    {{ sp.orden }}
                  </span>
                </button>
                @if (si < examen()!.preguntas!.length - 1) {
                  <div class="stepper-line"
                       [class.stepper-line--done]="lineaStepperCompletada(si)"></div>
                }
              }
            </div>
          </div>
          <div class="bg-gray-200 rounded-full overflow-hidden">
            <div class="pregunta-progress-fill"
                 [style.width.%]="porcentajeAvancePreguntas()"></div>
          </div>
        </div>

        <!-- Pregunta actual -->
        @if (preguntaActual(); as p) {
          <div class="card p-4 space-y-3">
            <p class="text-sm font-semibold text-gray-700">
              Pregunta {{ p.orden }} de {{ examen()!.totalPreguntas }}
            </p>
            <p class="text-sm text-gray-800">{{ p.enunciado }}</p>

            <div class="space-y-2">
              @for (opcion of ['A', 'B', 'C', 'D']; track opcion) {
                <label class="flex items-start gap-2 p-2 rounded border cursor-pointer
                              hover:bg-blue-50 transition-colors"
                       [class.border-blue-500]="respuestas()[p.idPregunta] === opcion"
                       [class.bg-blue-50]="respuestas()[p.idPregunta] === opcion">
                  <input type="radio"
                         [name]="'preg_' + p.idPregunta"
                         [value]="opcion"
                         [checked]="respuestas()[p.idPregunta] === opcion"
                         (change)="marcarRespuesta(p.idPregunta, opcion)"
                         class="mt-0.5" />
                  <span class="text-sm">
                    <strong>{{ opcion }}.</strong>
                    {{ getOpcion(p, opcion) }}
                  </span>
                </label>
              }
            </div>
          </div>
        }

        <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div class="flex gap-2 order-2 sm:order-1">
            <button
              type="button"
              (click)="pasoAnterior()"
              [disabled]="pasoIndex() <= 0"
              class="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Pregunta anterior">
              Anterior
            </button>
            <button
              type="button"
              (click)="pasoSiguiente()"
              [disabled]="pasoIndex() >= ultimoIndicePaso()"
              class="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Pregunta siguiente">
              Siguiente
            </button>
          </div>
          <div class="flex flex-wrap gap-2 justify-end order-1 sm:order-2">
            <span class="text-xs text-gray-400 self-center">
              Respondidas: {{ respondidas() }} / {{ examen()!.totalPreguntas }}
            </span>
            <button
              type="button"
              (click)="enviar()"
              [disabled]="enviando()"
              class="btn-primary disabled:opacity-50"
            >
              {{ enviando() ? '\u27f3 Enviando...' : 'Enviar Respuestas' }}
            </button>
          </div>
        </div>
      }
      </div>
    </div>
  `,
})
export class ExamenVirtualComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly idPost = Number(this.route.snapshot.paramMap.get('idPost'));
  protected readonly examen = signal<ExamenPostulanteResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly enviando = signal(false);
  protected readonly respuestas = signal<Record<number, string>>({});
  protected readonly tiempoRestante = signal(0);
  protected readonly pasoIndex = signal(0);

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private tiempoInicial = 0;

  protected readonly finalizado = computed(() => {
    const e = this.examen();
    return e?.estado === 'FINALIZADO' || e?.estado === 'EXPIRADO';
  });

  protected readonly respondidas = computed(() =>
    Object.values(this.respuestas()).filter((r) => r).length,
  );

  protected readonly porcentajeTiempo = computed(() => {
    if (this.tiempoInicial <= 0) return 0;
    return Math.max(0, (this.tiempoRestante() / this.tiempoInicial) * 100);
  });

  protected readonly preguntaActual = computed((): PreguntaExamenResponse | null => {
    const list = this.examen()?.preguntas ?? [];
    const i = this.pasoIndex();
    if (!list.length || i < 0 || i >= list.length) return null;
    return list[i] ?? null;
  });

  protected readonly porcentajeAvancePreguntas = computed(() => {
    const n = this.examen()?.preguntas?.length ?? 0;
    if (n <= 0) return 0;
    return Math.min(100, ((this.pasoIndex() + 1) / n) * 100);
  });

  protected readonly ultimoIndicePaso = computed(() => {
    const n = this.examen()?.preguntas?.length ?? 0;
    return Math.max(0, n - 1);
  });

  constructor() {
    this.iniciar();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private iniciar(): void {
    this.svc
      .iniciarExamen(this.idConv, this.idPost)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.examen.set(res);
          this.pasoIndex.set(0);
          this.loading.set(false);
          if (res.estado === 'EN_CURSO' && res.segundosRestantes > 0) {
            this.tiempoInicial = res.segundosRestantes;
            this.tiempoRestante.set(res.segundosRestantes);
            this.iniciarTimer();
          }
        },
        error: (err: { error?: { message?: string } }) => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'No se pudo iniciar el examen.');
        },
      });
  }

  private iniciarTimer(): void {
    this.timerInterval = setInterval(() => {
      const nuevo = this.tiempoRestante() - 1;
      if (nuevo <= 0) {
        this.tiempoRestante.set(0);
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.enviar(); // Auto-submit al expirar
      } else {
        this.tiempoRestante.set(nuevo);
      }
    }, 1000);
  }

  protected marcarRespuesta(idPregunta: number, opcion: string): void {
    this.respuestas.update((r) => ({ ...r, [idPregunta]: opcion }));
  }

  protected pasoAnterior(): void {
    this.pasoIndex.update((v) => Math.max(0, v - 1));
  }

  protected pasoSiguiente(): void {
    const max = this.ultimoIndicePaso();
    this.pasoIndex.update((v) => Math.min(max, v + 1));
  }

  protected irAPaso(i: number): void {
    const max = this.ultimoIndicePaso();
    this.pasoIndex.set(Math.max(0, Math.min(max, i)));
  }

  protected lineaStepperCompletada(i: number): boolean {
    const pregs = this.examen()?.preguntas ?? [];
    if (i < 0 || i >= pregs.length) return false;
    const id = pregs[i].idPregunta;
    return !!this.respuestas()[id] || i < this.pasoIndex();
  }

  protected getOpcion(p: PreguntaExamenResponse, letra: string): string {
    switch (letra) {
      case 'A': return p.opcionA;
      case 'B': return p.opcionB;
      case 'C': return p.opcionC;
      case 'D': return p.opcionD;
      default: return '';
    }
  }

  protected formatTiempo(segs: number): string {
    const m = Math.floor(segs / 60);
    const s = segs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  protected enviar(): void {
    if (this.enviando() || this.finalizado()) return;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const pregs = this.examen()?.preguntas ?? [];
    const resps = this.respuestas();

    this.enviando.set(true);
    this.svc
      .responderExamen(this.idConv, this.idPost, {
        respuestas: pregs.map((p) => ({
          idPregunta: p.idPregunta,
          respuesta: resps[p.idPregunta] ?? null,
        })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.examen.set(res);
          this.enviando.set(false);
          this.toast.success(res.mensaje ?? 'Examen finalizado.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.enviando.set(false);
          this.toast.error(err?.error?.message ?? 'Error al enviar respuestas.');
        },
      });
  }
}
