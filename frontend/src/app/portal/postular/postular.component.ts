import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/http/api.service';
import { ToastService } from '@core/services/toast.service';
import { map } from 'rxjs/operators';

interface PostulacionResponse {
  idPostulacion: number;
  idConvocatoria: number;
  estado: string;
  mensaje: string;
}

interface DatosPaso1 {
  declaraVerdad: boolean;
  aceptaTerminos: boolean;
}

interface DatosPaso2 {
  esLicenciadoFfaa: boolean;
  esPersonaDiscap: boolean;
  esDeportistaDest: boolean;
}

interface DatosPaso3 {
  aceptaDdjj: boolean;
  aceptaNormativa: boolean;
}

type Paso = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-postular',
  standalone: true,
  imports: [RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">

      <!-- Header portal -->
      <header class="bg-[#1E3A5F] text-white px-6 py-4 flex items-center gap-3 shadow">
        <div class="w-8 h-8 bg-[#D4A843] rounded-full flex items-center justify-center font-bold text-[#1F2133] text-sm shrink-0">A</div>
        <div>
          <p class="font-bold text-sm">SISCONV — ACFFAA</p>
          <p class="text-xs text-blue-200">Postulación CAS</p>
        </div>
        <div class="ml-auto">
          <a routerLink="/portal/postulaciones" class="text-sm text-blue-200 hover:text-white">← Mis Postulaciones</a>
        </div>
      </header>

      <main class="flex-1 flex items-start justify-center p-6">
        <div class="w-full max-w-xl space-y-4">

          <!-- Título convocatoria -->
          <div class="text-center">
            <h1 class="text-xl font-bold text-[#1E3A5F]">Postulación a Convocatoria CAS</h1>
            <p class="text-sm text-gray-500 mt-1">Convocatoria N° {{ idConv }}</p>
          </div>

          <!-- Stepper -->
          <div class="flex items-center justify-between px-2">
            @for (step of steps; track step.n) {
              <div class="flex flex-col items-center gap-1 flex-1">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                  [class]="pasoActual() > step.n
                    ? 'bg-green-500 text-white'
                    : pasoActual() === step.n
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-gray-200 text-gray-500'"
                >
                  {{ pasoActual() > step.n ? '✓' : step.n }}
                </div>
                <p class="text-xs text-center text-gray-500 hidden sm:block">{{ step.label }}</p>
              </div>
              @if (step.n < 4) {
                <div class="h-0.5 flex-1 mx-1 transition-colors"
                     [class]="pasoActual() > step.n ? 'bg-green-400' : 'bg-gray-200'">
                </div>
              }
            }
          </div>

          <!-- PASO 1 — Datos de confirmación -->
          @if (pasoActual() === 1) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              <h2 class="font-bold text-base text-[#1E3A5F]">Paso 1 — Confirmación de Datos</h2>
              <p class="text-sm text-gray-600">
                Antes de postular, confirme que sus datos de perfil están completos y actualizados.
                El sistema usará la información registrada en <strong>Mi Perfil</strong>.
              </p>
              <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                <p>📋 Revise que su perfil incluya: formación académica, experiencia laboral,
                   conocimientos y documentos actualizados.</p>
              </div>
              <div class="space-y-3">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="paso1.declaraVerdad"
                         class="mt-0.5 h-4 w-4 rounded border-gray-300" />
                  <span class="text-sm text-gray-700">
                    Declaro que la información de mi perfil es verídica y corresponde a documentos
                    originales que presentaré si soy seleccionado.
                  </span>
                </label>
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="paso1.aceptaTerminos"
                         class="mt-0.5 h-4 w-4 rounded border-gray-300" />
                  <span class="text-sm text-gray-700">
                    He revisado las Bases de la Convocatoria y acepto participar bajo sus términos.
                  </span>
                </label>
              </div>
              <div class="flex justify-between pt-2">
                <a routerLink="/portal/postulaciones" class="btn-ghost text-sm">Cancelar</a>
                <button
                  (click)="irPaso(2)"
                  [disabled]="!paso1.declaraVerdad || !paso1.aceptaTerminos"
                  class="btn-primary text-sm disabled:opacity-50"
                >
                  Continuar →
                </button>
              </div>
            </div>
          }

          <!-- PASO 2 — Condición especial (bonificaciones) -->
          @if (pasoActual() === 2) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              <h2 class="font-bold text-base text-[#1E3A5F]">Paso 2 — Condición Especial</h2>
              <p class="text-sm text-gray-600">
                Declare si aplica a alguna bonificación legal. Deberá sustentar con documentos
                al momento de la suscripción del contrato.
              </p>

              <div class="space-y-3">
                <!-- FFAA -->
                <label class="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-blue-50 transition-colors"
                       [class.border-blue-400]="paso2.esLicenciadoFfaa"
                       [class.bg-blue-50]="paso2.esLicenciadoFfaa">
                  <input type="checkbox" [(ngModel)]="paso2.esLicenciadoFfaa"
                         class="mt-0.5 h-4 w-4" />
                  <div>
                    <p class="text-sm font-semibold text-blue-700">🎖️ Licenciado FF.AA. (+10%)</p>
                    <p class="text-xs text-gray-500">Ley 29248 — Ley del Licenciado de las FF.AA.</p>
                  </div>
                </label>

                <!-- Discapacidad -->
                <label class="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-purple-50 transition-colors"
                       [class.border-purple-400]="paso2.esPersonaDiscap"
                       [class.bg-purple-50]="paso2.esPersonaDiscap">
                  <input type="checkbox" [(ngModel)]="paso2.esPersonaDiscap"
                         class="mt-0.5 h-4 w-4" />
                  <div>
                    <p class="text-sm font-semibold text-purple-700">♿ Persona con Discapacidad (+15%)</p>
                    <p class="text-xs text-gray-500">Ley 29973 — Ley General de la Persona con Discapacidad</p>
                  </div>
                </label>

                <!-- Deportista -->
                <label class="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-amber-50 transition-colors"
                       [class.border-amber-400]="paso2.esDeportistaDest"
                       [class.bg-amber-50]="paso2.esDeportistaDest">
                  <input type="checkbox" [(ngModel)]="paso2.esDeportistaDest"
                         class="mt-0.5 h-4 w-4" />
                  <div>
                    <p class="text-sm font-semibold text-amber-700">🏅 Deportista Destacado (+5%)</p>
                    <p class="text-xs text-gray-500">Ley 27674 — Deportista Calificado de Alto Nivel</p>
                  </div>
                </label>
              </div>

              <div class="flex justify-between pt-2">
                <button (click)="irPaso(1)" class="btn-ghost text-sm">← Anterior</button>
                <button (click)="irPaso(3)" class="btn-primary text-sm">Continuar →</button>
              </div>
            </div>
          }

          <!-- PASO 3 — Declaración Jurada -->
          @if (pasoActual() === 3) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              <h2 class="font-bold text-base text-[#1E3A5F]">Paso 3 — Declaración Jurada</h2>
              <div class="bg-gray-50 border rounded p-4 text-xs text-gray-700 space-y-2 max-h-48 overflow-y-auto">
                <p class="font-bold text-sm">DECLARACIÓN JURADA DE DATOS</p>
                <p>Yo, el suscrito(a), declaro bajo juramento que:</p>
                <ol class="list-decimal ml-4 space-y-1">
                  <li>Los datos personales y profesionales consignados en el sistema son verídicos.</li>
                  <li>No me encuentro incurso(a) en ninguna de las incompatibilidades establecidas por ley.</li>
                  <li>No tengo antecedentes penales, policiales ni judiciales que impidan mi contratación.</li>
                  <li>No me encuentro registrado(a) en el RNSSC ni en el REGIPREC con sanciones vigentes.</li>
                  <li>Acepto someterme a la verificación de mis datos ante la autoridad competente.</li>
                  <li>Conozco que la falsedad en las declaraciones conlleva responsabilidad legal.</li>
                </ol>
                <p class="text-gray-400 text-xs mt-2">
                  Base legal: D.Leg. 1057 · D.S. 065-2011-PCM · D.L. 1451
                </p>
              </div>
              <div class="space-y-2">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="paso3.aceptaDdjj"
                         class="mt-0.5 h-4 w-4" />
                  <span class="text-sm text-gray-700">
                    Declaro que he leído y acepto la Declaración Jurada anterior, siendo responsable por su veracidad.
                  </span>
                </label>
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="paso3.aceptaNormativa"
                         class="mt-0.5 h-4 w-4" />
                  <span class="text-sm text-gray-700">
                    Acepto el tratamiento de mis datos personales conforme a la Ley N° 29733.
                  </span>
                </label>
              </div>
              <div class="flex justify-between pt-2">
                <button (click)="irPaso(2)" class="btn-ghost text-sm">← Anterior</button>
                <button
                  (click)="irPaso(4)"
                  [disabled]="!paso3.aceptaDdjj || !paso3.aceptaNormativa"
                  class="btn-primary text-sm disabled:opacity-50"
                >
                  Continuar →
                </button>
              </div>
            </div>
          }

          <!-- PASO 4 — Confirmación y envío E17 -->
          @if (pasoActual() === 4) {
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              <h2 class="font-bold text-base text-[#1E3A5F]">Paso 4 — Confirmar Postulación</h2>

              @if (!postulacionCreada()) {
                <div class="space-y-3">
                  <p class="text-sm text-gray-600">
                    Revise el resumen antes de confirmar. Una vez enviada, la postulación quedará
                    en estado <strong>REGISTRADO</strong> y deberá adjuntar su expediente digital.
                  </p>
                  <div class="bg-gray-50 rounded p-4 text-sm space-y-2">
                    <p><strong>Convocatoria N°:</strong> {{ idConv }}</p>
                    <p><strong>Licenciado FF.AA.:</strong>
                      <span [class]="paso2.esLicenciadoFfaa ? 'text-green-600' : 'text-gray-400'">
                        {{ paso2.esLicenciadoFfaa ? '✓ Sí (+10%)' : 'No' }}
                      </span>
                    </p>
                    <p><strong>Discapacidad:</strong>
                      <span [class]="paso2.esPersonaDiscap ? 'text-purple-600' : 'text-gray-400'">
                        {{ paso2.esPersonaDiscap ? '✓ Sí (+15%)' : 'No' }}
                      </span>
                    </p>
                    <p><strong>Deportista Destacado:</strong>
                      <span [class]="paso2.esDeportistaDest ? 'text-amber-600' : 'text-gray-400'">
                        {{ paso2.esDeportistaDest ? '✓ Sí (+5%)' : 'No' }}
                      </span>
                    </p>
                    <p><strong>DDJJ:</strong> <span class="text-green-600">✓ Aceptada</span></p>
                  </div>
                  <div class="flex justify-between pt-2">
                    <button (click)="irPaso(3)" class="btn-ghost text-sm">← Anterior</button>
                    <button
                      (click)="confirmarPostulacion()"
                      [disabled]="enviando()"
                      class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50"
                    >
                      {{ enviando() ? 'Registrando...' : '✓ Confirmar Postulación (E17)' }}
                    </button>
                  </div>
                </div>
              } @else {
                <!-- Éxito: postulación registrada -->
                <div class="text-center space-y-4 py-4">
                  <div class="text-5xl">🎉</div>
                  <h3 class="text-lg font-bold text-green-700">¡Postulación Registrada!</h3>
                  <p class="text-sm text-gray-600">
                    Su postulación N° <strong>{{ postulacionCreada()!.idPostulacion }}</strong>
                    fue registrada exitosamente con estado <strong>REGISTRADO</strong>.
                  </p>
                  <div class="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                    <p class="font-semibold">📎 Paso siguiente: Adjuntar Expediente</p>
                    <p class="text-xs mt-1">
                      Para completar su postulación debe adjuntar los documentos requeridos
                      en el Expediente Virtual. Sin documentos, su postulación quedará incompleta.
                    </p>
                  </div>
                  <div class="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                      [routerLink]="['/portal/expediente', postulacionCreada()!.idPostulacion]"
                      class="bg-[#1E3A5F] hover:bg-[#2D5F8A] text-white font-semibold px-5 py-2 rounded text-sm transition-colors"
                    >
                      📎 Adjuntar Expediente (E18)
                    </a>
                    <a routerLink="/portal/postulaciones"
                       class="border border-gray-300 text-gray-600 hover:bg-gray-50 px-5 py-2 rounded text-sm">
                      Ver Mis Postulaciones
                    </a>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </main>
    </div>
  `,
})
export class PostularComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('idConv'));
  protected readonly pasoActual = signal<Paso>(1);
  protected readonly enviando = signal(false);
  protected readonly postulacionCreada = signal<PostulacionResponse | null>(null);

  protected readonly steps = [
    { n: 1, label: 'Confirmación' },
    { n: 2, label: 'Condición' },
    { n: 3, label: 'DDJJ' },
    { n: 4, label: 'Postular' },
  ] as const;

  // Estado de cada paso
  protected paso1: DatosPaso1 = { declaraVerdad: false, aceptaTerminos: false };
  protected paso2: DatosPaso2 = {
    esLicenciadoFfaa: false,
    esPersonaDiscap: false,
    esDeportistaDest: false,
  };
  protected paso3: DatosPaso3 = { aceptaDdjj: false, aceptaNormativa: false };

  protected irPaso(paso: Paso): void {
    this.pasoActual.set(paso);
  }

  protected confirmarPostulacion(): void {
    this.enviando.set(true);
    this.api
      .post<PostulacionResponse>('/postulaciones', {
        idConvocatoria: this.idConv,
        esLicenciadoFfaa: this.paso2.esLicenciadoFfaa,
        esPersonaDiscap: this.paso2.esPersonaDiscap,
        esDeportistaDest: this.paso2.esDeportistaDest,
        declaracionJurada: this.paso3.aceptaDdjj,
      })
      .pipe(
        map((r) => r.data),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.postulacionCreada.set(res);
          this.enviando.set(false);
          this.toast.success('Postulación registrada. Ahora adjunte su expediente.');
        },
        error: () => {
          this.enviando.set(false);
          this.toast.error('Error al registrar la postulación. Inténtelo nuevamente.');
        },
      });
  }
}
