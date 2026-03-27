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
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { VerificacionDl1451Request } from '../../models/seleccion.model';

/** Valores exactos que espera el backend Java */
const SIN_SANCIONES = 'SIN_SANCIONES' as const;
const CON_SANCIONES = 'CON_SANCIONES' as const;

type ResultadoVerif = typeof SIN_SANCIONES | typeof CON_SANCIONES | null;

@Component({
  selector: 'app-dl1451',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 max-w-2xl">
      <app-page-header
        title="Verificación D.L. 1451 — Inhabilitaciones"
        subtitle="E19 · RNSSC + REGIPREC · Postulación N° {{ idPost }}">
        <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
           class="btn-ghost text-sm">← Postulantes</a>
      </app-page-header>

      <!-- Banner legal obligatorio -->
      <div class="rounded-lg p-4 bg-[#1E3A5F] text-white">
        <div class="flex items-center gap-3">
          <span class="text-xl">📋</span>
          <div>
            <p class="font-bold text-sm">D.L. 1451 — Verificación Obligatoria de Inhabilitaciones</p>
            <p class="text-xs text-blue-200 mt-0.5">
              Todo postulante al servicio civil debe ser verificado en los registros oficiales
              antes de continuar con el proceso de selección.
            </p>
          </div>
        </div>
      </div>

      <!-- Cards semáforo -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <!-- RNSSC -->
        <div
          class="card border-2 transition-all"
          [class]="rnssc() === SIN_SANCIONES
            ? 'border-green-500 bg-green-50'
            : rnssc() === CON_SANCIONES
            ? 'border-red-500 bg-red-50'
            : 'border-gray-200'"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full transition-colors"
                   [class]="rnssc() === SIN_SANCIONES ? 'bg-green-500'
                            : rnssc() === CON_SANCIONES ? 'bg-red-500'
                            : 'bg-gray-300'"></div>
              <span class="font-bold text-sm">RNSSC</span>
            </div>
            @if (rnssc()) {
              <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                    [class]="rnssc() === SIN_SANCIONES
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'">
                {{ rnssc() === SIN_SANCIONES ? '✓ SIN IMPEDIMENTO' : '✗ CON IMPEDIMENTO' }}
              </span>
            }
          </div>
          <p class="font-semibold text-sm">Registro Nacional de Sanciones</p>
          <p class="text-xs text-gray-500 mt-1">
            Registro Nacional de Sanciones a Servidores Civiles (RNSSC).
            Verificar acceso en <strong>servir.gob.pe</strong>
          </p>
          <div class="mt-3 flex gap-2">
            <button
              (click)="rnssc.set(SIN_SANCIONES)"
              class="flex-1 py-1.5 text-xs rounded border font-medium transition-colors"
              [class]="rnssc() === SIN_SANCIONES
                ? 'bg-green-500 text-white border-green-500'
                : 'border-gray-300 text-gray-600 hover:border-green-400'"
            >✓ Sin Impedimento</button>
            <button
              (click)="rnssc.set(CON_SANCIONES)"
              class="flex-1 py-1.5 text-xs rounded border font-medium transition-colors"
              [class]="rnssc() === CON_SANCIONES
                ? 'bg-red-500 text-white border-red-500'
                : 'border-gray-300 text-gray-600 hover:border-red-400'"
            >✗ Con Impedimento</button>
          </div>
        </div>

        <!-- REGIPREC -->
        <div
          class="card border-2 transition-all"
          [class]="regiprec() === SIN_SANCIONES
            ? 'border-green-500 bg-green-50'
            : regiprec() === CON_SANCIONES
            ? 'border-red-500 bg-red-50'
            : 'border-gray-200'"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full transition-colors"
                   [class]="regiprec() === SIN_SANCIONES ? 'bg-green-500'
                            : regiprec() === CON_SANCIONES ? 'bg-red-500'
                            : 'bg-gray-300'"></div>
              <span class="font-bold text-sm">REGIPREC</span>
            </div>
            @if (regiprec()) {
              <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                    [class]="regiprec() === SIN_SANCIONES
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'">
                {{ regiprec() === SIN_SANCIONES ? '✓ SIN IMPEDIMENTO' : '✗ CON IMPEDIMENTO' }}
              </span>
            }
          </div>
          <p class="font-semibold text-sm">Registro de Impedimentos</p>
          <p class="text-xs text-gray-500 mt-1">
            Registro de Personas Impedidas de ejercer función pública (REGIPREC).
            Verificar en <strong>pj.gob.pe</strong>
          </p>
          <div class="mt-3 flex gap-2">
            <button
              (click)="regiprec.set(SIN_SANCIONES)"
              class="flex-1 py-1.5 text-xs rounded border font-medium transition-colors"
              [class]="regiprec() === SIN_SANCIONES
                ? 'bg-green-500 text-white border-green-500'
                : 'border-gray-300 text-gray-600 hover:border-green-400'"
            >✓ Sin Impedimento</button>
            <button
              (click)="regiprec.set(CON_SANCIONES)"
              class="flex-1 py-1.5 text-xs rounded border font-medium transition-colors"
              [class]="regiprec() === CON_SANCIONES
                ? 'bg-red-500 text-white border-red-500'
                : 'border-gray-300 text-gray-600 hover:border-red-400'"
            >✗ Con Impedimento</button>
          </div>
        </div>
      </div>

      <!-- Resultado global -->
      @if (ambosSeleccionados()) {
        <div class="card p-4 border-2 transition-all"
             [class]="ambosLimpios()
               ? 'border-green-400 bg-green-50'
               : 'border-red-400 bg-red-50'">
          <p class="font-semibold text-sm"
             [class]="ambosLimpios() ? 'text-green-700' : 'text-red-700'">
            {{ ambosLimpios()
              ? '✓ Verificación completa — Postulante pasará a estado APTO'
              : '✗ Postulante con impedimento — Pasará a estado NO_APTO' }}
          </p>
          @if (!ambosLimpios()) {
            <p class="text-xs text-red-500 mt-1">
              El estado del postulante cambiará a NO_APTO al guardar.
              Esta acción es irreversible.
            </p>
          }
        </div>
      }

      <!-- Observación + guardar -->
      <div class="card space-y-3">
        <label class="label-field text-sm">Observación (opcional)</label>
        <textarea
          [value]="observacion()"
          (input)="observacion.set($any($event.target).value)"
          rows="3"
          class="input-field w-full text-sm"
          placeholder="Ingrese observaciones si las hubiera..."
        ></textarea>

        <div class="flex gap-2 justify-end">
          <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
             class="btn-ghost">Cancelar</a>
          <button
            (click)="guardar()"
            [disabled]="guardando() || !ambosSeleccionados()"
            class="btn-primary disabled:opacity-50"
          >
            {{ guardando() ? 'Guardando...' : 'Guardar Verificación' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class Dl1451Component {
  // Exponer constantes al template
  protected readonly SIN_SANCIONES = SIN_SANCIONES;
  protected readonly CON_SANCIONES = CON_SANCIONES;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly idPost = Number(this.route.snapshot.paramMap.get('idPost'));

  protected readonly rnssc = signal<ResultadoVerif>(null);
  protected readonly regiprec = signal<ResultadoVerif>(null);
  protected readonly observacion = signal('');
  protected readonly guardando = signal(false);
  protected readonly cargando = signal(true);

  protected readonly ambosSeleccionados = computed(
    () => this.rnssc() !== null && this.regiprec() !== null,
  );

  protected readonly ambosLimpios = computed(
    () => this.rnssc() === SIN_SANCIONES && this.regiprec() === SIN_SANCIONES,
  );

  constructor() {
    // Pre-poblar formulario con los valores ya guardados (si existen).
    // Si el GET falla, el formulario queda operativo con campos vacíos para nuevo ingreso.
    this.svc
      .obtenerPostulacion(this.idPost)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (post) => {
          if (post.verificacionRnssc) this.rnssc.set(post.verificacionRnssc as ResultadoVerif);
          if (post.verificacionRegiprec) this.regiprec.set(post.verificacionRegiprec as ResultadoVerif);
          if (post.observacionDl) this.observacion.set(post.observacionDl);
          this.cargando.set(false);
        },
        // No bloquear el formulario si falla la carga — ORH puede ingresar datos de cero
        error: () => { this.cargando.set(false); },
      });
  }

  protected guardar(): void {
    if (!this.ambosSeleccionados()) return;

    /**
     * FIX BUG-C: enviamos los strings exactos que el backend espera,
     * NO boolean. Backend: private String verificacionRnssc → "SIN_SANCIONES" | "CON_SANCIONES"
     */
    const req: VerificacionDl1451Request = {
      verificacionRnssc: this.rnssc()!,
      verificacionRegiprec: this.regiprec()!,
      observacion: this.observacion().trim() || undefined,
    };

    this.guardando.set(true);
    this.svc
      .verificarDl1451(this.idPost, req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          const msg = this.ambosLimpios()
            ? 'Verificación D.L. 1451 registrada correctamente.'
            : 'Postulante marcado como NO_APTO por impedimento D.L. 1451.';
          this.toast.success(msg);
          this.router.navigate(['/sistema/seleccion', this.idConv, 'postulantes']);
        },
        error: () => {
          this.guardando.set(false);
          this.toast.error('Error al guardar la verificación. Intente nuevamente.');
        },
      });
  }
}
