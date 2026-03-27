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
import { SeleccionService } from '@features/seleccion/services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { TachaRequest, TachaResponse } from '@features/seleccion/models/seleccion.model';

const MOTIVOS_TACHA = [
  'Documentos irregulares o falsificados',
  'Incumple requisitos mínimos del perfil',
  'Conflicto de interés no declarado',
  'Declaración Jurada con información falsa',
  'Impedimento legal (inhabilitación)',
  'Otro motivo',
] as const;

@Component({
  selector: 'app-registrar-tacha',
  standalone: true,
  imports: [RouterLink, FormsModule, SlicePipe],   // ← FIX
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">

      <!-- Header portal -->
      <header class="bg-[#1E3A5F] text-white px-6 py-4 flex items-center gap-3 shadow">
        <div class="w-8 h-8 bg-[#D4A843] rounded-full flex items-center justify-center font-bold text-[#1F2133] text-sm shrink-0">A</div>
        <div>
          <p class="font-bold text-sm">SISCONV — ACFFAA</p>
          <p class="text-xs text-blue-200">Portal del Postulante</p>
        </div>
        <div class="ml-auto">
          <a routerLink="/portal/postulaciones" class="text-sm text-blue-200 hover:text-white">
            ← Mis Postulaciones
          </a>
        </div>
      </header>

      <main class="flex-1 flex items-start justify-center p-6">
        <div class="w-full max-w-lg space-y-4">

          @if (!registrado()) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div class="bg-amber-600 text-white px-6 py-4">
                <h1 class="font-bold text-lg">⚖️ Registrar Tacha</h1>
                <p class="text-sm text-amber-100 mt-1">
                  E21 · RF-12 · Período de tachas — 24 horas desde la publicación de inscritos
                </p>
              </div>

              <div class="p-6 space-y-4">
                <!-- Aviso legal -->
                <div class="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                  <p class="font-semibold">📋 Información importante</p>
                  <p class="mt-1">
                    Solo puede registrar una tacha si tiene evidencia objetiva de irregularidades.
                    Las tachas sin fundamento serán declaradas <strong>INFUNDADAS</strong>.
                  </p>
                </div>

                <!-- Convocatoria -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">
                    Convocatoria N°
                  </label>
                  <p class="text-sm font-mono bg-gray-50 border border-gray-200 rounded px-3 py-2">
                    {{ idConv }}
                  </p>
                </div>

                <!-- ID Postulación impugnada -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">
                    N° de Postulación impugnada <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    [(ngModel)]="idPostulacion"
                    class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Ingrese el número de postulación..."
                  />
                </div>

                <!-- Motivo -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">
                    Motivo <span class="text-red-500">*</span>
                  </label>
                  <select
                    [(ngModel)]="motivo"
                    class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  >
                    <option value="">— Seleccione el motivo —</option>
                    @for (m of motivosTacha; track m) {
                      <option [value]="m">{{ m }}</option>
                    }
                  </select>
                </div>

                <!-- Descripción -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">
                    Descripción detallada <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    [(ngModel)]="descripcion"
                    rows="4"
                    maxlength="500"
                    class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                    placeholder="Describa con detalle el fundamento de la tacha..."
                  ></textarea>
                  <p class="text-xs text-gray-400 text-right mt-0.5">
                    {{ descripcion.length }}/500
                  </p>
                </div>

                <div class="flex gap-3 justify-end pt-2">
                  <a routerLink="/portal/postulaciones"
                     class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
                    Cancelar
                  </a>
                  <button
                    (click)="registrar()"
                    [disabled]="!puedeSend() || enviando()"
                    class="px-5 py-2 text-sm font-semibold rounded text-white transition-colors disabled:opacity-50"
                    [class]="puedeSend()
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-gray-400'"
                  >
                    {{ enviando() ? 'Registrando...' : 'Registrar Tacha' }}
                  </button>
                </div>
              </div>
            </div>

          } @else {
            <!-- Confirmación -->
            <div class="bg-white rounded-lg shadow-sm border border-green-200 text-center p-8 space-y-4">
              <div class="text-5xl">✅</div>
              <h2 class="text-xl font-bold text-green-700">Tacha Registrada</h2>
              <p class="text-sm text-gray-600">
                Su tacha N° <strong>{{ registrado()!.idTacha }}</strong> fue registrada.
                La ORH la resolverá dentro del período establecido en el cronograma.
              </p>
              <div class="bg-gray-50 rounded p-3 text-left text-xs space-y-1">
                <p><strong>Postulación impugnada:</strong> {{ registrado()!.idPostulacion }}</p>
                <p>
                  <strong>Estado:</strong>
                  <span class="text-yellow-700 font-semibold ml-1">{{ registrado()!.estado }}</span>
                </p>
                <p><strong>Fecha:</strong> {{ registrado()!.fechaRegistro | slice:0:10 }}</p>
              </div>
              <a routerLink="/portal/postulaciones"
                 class="inline-block bg-[#1E3A5F] text-white px-5 py-2 rounded text-sm font-semibold hover:bg-[#2D5F8A] transition-colors">
                Ver mis Postulaciones
              </a>
            </div>
          }
        </div>
      </main>
    </div>
  `,
})
export class RegistrarTachaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('idConv'));
  protected readonly motivosTacha = MOTIVOS_TACHA;

  protected idPostulacion = 0;
  protected motivo = '';
  protected descripcion = '';

  protected readonly enviando = signal(false);
  protected readonly registrado = signal<TachaResponse | null>(null);

  protected puedeSend(): boolean {
    return this.idPostulacion > 0 && this.motivo !== '' && this.descripcion.trim().length >= 20;
  }

  protected registrar(): void {
    if (!this.puedeSend()) return;

    const req: TachaRequest = {
      idPostulacion: this.idPostulacion,
      motivo: this.motivo,
      descripcion: this.descripcion.trim(),
    };

    this.enviando.set(true);
    this.svc
      .registrarTacha(this.idConv, req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.registrado.set(res);
          this.enviando.set(false);
        },
        error: () => {
          this.enviando.set(false);
          this.toast.error('Error al registrar la tacha. Inténtelo nuevamente.');
        },
      });
  }
}
