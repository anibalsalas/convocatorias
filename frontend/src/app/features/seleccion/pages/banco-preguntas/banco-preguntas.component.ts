import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { PreguntaItem, BancoPreguntaEstadoResponse } from '../../models/seleccion.model';

interface PreguntaForm extends PreguntaItem {
  numero: number;
}

@Component({
  selector: 'app-banco-preguntas',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Banco de Preguntas — Examen Técnico Virtual"
        subtitle="Cargue entre 20 y 30 preguntas: puntaje por \u00edtem (m\u00edn. 1) y respuesta correcta">
        <a [routerLink]="['/sistema/dashboard']"
           class="btn-ghost text-sm">\u2190 Dashboard</a>
      </app-page-header>

      @if (resultado()) {
        <div class="card border border-green-300 bg-green-50 p-4">
          <p class="font-semibold text-green-700 text-sm">
            \u2713 {{ resultado()!.mensaje }}
          </p>
          <p class="text-xs text-gray-500 mt-1">
            Total: {{ resultado()!.totalPreguntas }} preguntas \u2014
            Cargado por: {{ resultado()!.usuarioCarga }}
          </p>
          <a routerLink="/sistema/dashboard"
             class="btn-secondary text-sm inline-block mt-2">
            \u2190 Volver al Dashboard
          </a>
          <p class="text-[10px] text-gray-500 mt-2 max-w-xl">
            ORH verificará el banco (metadatos) en <strong>M03 Selección</strong> \u2192
            <strong>E26-V Configuración del Examen Virtual</strong>.
          </p>
        </div>
      }

      <!-- Formulario de preguntas -->
      @if (!resultado()) {
        <div class="card p-4 space-y-1" (input)="notificarCambio()" (change)="notificarCambio()">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm text-gray-600">
              Preguntas: <strong>{{ preguntas().length }}</strong> / 30
              <span class="text-xs text-gray-400 ml-2">(m\u00ednimo 20)</span>
            </p>
            @if (preguntas().length < 30) {
              <button (click)="agregarPregunta()" class="btn-secondary text-sm">
                + Agregar Pregunta
              </button>
            }
          </div>

          @for (p of preguntas(); track p.numero; let i = $index) {
            <div class="border rounded-lg p-3 space-y-2 bg-gray-50">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-gray-700">
                  Pregunta {{ p.numero }}
                </span>
                @if (preguntas().length > 20) {
                  <button (click)="eliminarPregunta(i)"
                          class="text-red-500 text-xs hover:underline">
                    Eliminar
                  </button>
                }
              </div>

              <textarea
                [(ngModel)]="p.enunciado"
                rows="4"
                class="input w-full text-sm resize-y min-h-[5rem]"
                [placeholder]="'Enunciado de la pregunta ' + p.numero"
              ></textarea>

              <div class="grid grid-cols-2 gap-2">
                <div class="flex items-center gap-1">
                  <span class="text-xs font-bold w-4">A</span>
                  <input type="text" [(ngModel)]="p.opcionA"
                         class="input flex-1 text-sm" placeholder="Opci\u00f3n A" />
                </div>
                <div class="flex items-center gap-1">
                  <span class="text-xs font-bold w-4">B</span>
                  <input type="text" [(ngModel)]="p.opcionB"
                         class="input flex-1 text-sm" placeholder="Opci\u00f3n B" />
                </div>
                <div class="flex items-center gap-1">
                  <span class="text-xs font-bold w-4">C</span>
                  <input type="text" [(ngModel)]="p.opcionC"
                         class="input flex-1 text-sm" placeholder="Opci\u00f3n C" />
                </div>
                <div class="flex items-center gap-1">
                  <span class="text-xs font-bold w-4">D</span>
                  <input type="text" [(ngModel)]="p.opcionD"
                         class="input flex-1 text-sm" placeholder="Opci\u00f3n D" />
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-4">
                <div class="flex items-center gap-2">
                  <label class="text-xs text-gray-500">Respuesta correcta:</label>
                  <select [(ngModel)]="p.respuestaCorrecta"
                          class="input text-sm w-20">
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-xs text-gray-500" [attr.for]="'pj-' + p.numero">Puntaje (pts)</label>
                  <input
                    type="number"
                    [id]="'pj-' + p.numero"
                    [(ngModel)]="p.puntaje"
                    min="1"
                    step="0.01"
                    (keydown)="bloquearNoNumericos($event)"
                    class="input text-sm w-24 tabular-nums"
                    title="M\u00ednimo 1 punto por pregunta (RN examen virtual)"
                  />
                </div>
              </div>
            </div>
          }
        </div>

        <div class="flex gap-2 justify-end">
          <button
            (click)="guardar()"
            [disabled]="guardando() || !formValido()"
            class="btn-primary disabled:opacity-50"
          >
            {{ guardando() ? '\u27f3 Guardando...' : 'Cargar Banco de Preguntas' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class BancoPreguntasComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly preguntas = signal<PreguntaForm[]>(this.generarPreguntas(20));
  protected readonly resultado = signal<BancoPreguntaEstadoResponse | null>(null);
  protected readonly guardando = signal(false);

  protected readonly formValido = computed(() => {
    const list = this.preguntas();
    if (list.length < 20) return false;
    return list.every((p) => {
      const pj = Number(p.puntaje);
      return (
        p.enunciado?.trim() &&
        p.opcionA?.trim() &&
        p.opcionB?.trim() &&
        p.opcionC?.trim() &&
        p.opcionD?.trim() &&
        ['A', 'B', 'C', 'D'].includes(p.respuestaCorrecta) &&
        Number.isFinite(pj) &&
        pj >= 1
      );
    });
  });

  protected notificarCambio(): void {
    this.preguntas.update(list => [...list]);
  }

  /** Evita e, E, + en input numérico de puntaje */
  protected bloquearNoNumericos(event: KeyboardEvent): void {
    if (['e', 'E', '+'].includes(event.key)) {
      event.preventDefault();
    }
  }

  private generarPreguntas(n: number): PreguntaForm[] {
    return Array.from({ length: n }, (_, i) => ({
      numero: i + 1,
      enunciado: '',
      opcionA: '',
      opcionB: '',
      opcionC: '',
      opcionD: '',
      respuestaCorrecta: 'A',
      puntaje: 1,
    }));
  }

  protected agregarPregunta(): void {
    if (this.preguntas().length >= 30) return;
    const next = this.preguntas().length + 1;
    this.preguntas.update((list) => [
      ...list,
      {
        numero: next,
        enunciado: '',
        opcionA: '',
        opcionB: '',
        opcionC: '',
        opcionD: '',
        respuestaCorrecta: 'A',
        puntaje: 1,
      },
    ]);
  }

  protected eliminarPregunta(index: number): void {
    if (this.preguntas().length <= 20) return;
    this.preguntas.update((list) => {
      const nuevo = list.filter((_, i) => i !== index);
      return nuevo.map((p, i) => ({ ...p, numero: i + 1 }));
    });
  }

  protected guardar(): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.svc
      .cargarBancoPreguntas(this.idConv, {
        preguntas: this.preguntas().map((p) => {
          const pj = Number(p.puntaje);
          return {
            enunciado: p.enunciado,
            opcionA: p.opcionA,
            opcionB: p.opcionB,
            opcionC: p.opcionC,
            opcionD: p.opcionD,
            respuestaCorrecta: p.respuestaCorrecta,
            puntaje: Number.isFinite(pj) && pj >= 1 ? pj : 1,
          };
        }),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.resultado.set(res);
          this.guardando.set(false);
          this.toast.success(res.mensaje ?? 'Banco cargado correctamente.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.guardando.set(false);
          this.toast.error(err?.error?.message ?? 'Error al cargar banco de preguntas.');
        },
      });
  }
}
