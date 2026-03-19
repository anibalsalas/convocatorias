import {
  ChangeDetectionStrategy, Component, DestroyRef,
  OnInit, inject, input, output, signal, computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ToastService } from '@core/services/toast.service';
import { ConvocatoriaService } from '../../services/convocatoria.service';
import { ConvocatoriaResponse } from '../../models/convocatoria.model';
import { RequerimientoService } from '@features/requerimiento/services/requerimiento.service';
import { RequerimientoResponse } from '@features/requerimiento/models/requerimiento.model';

/**
 * Modal de gestión in-situ de convocatoria.
 * Permite visualizar datos heredados (solo lectura) y actualizar campos editables por ORH.
 * Emite `cerrado` (con flag indica si se actualizó) para que el padre refresque la lista.
 */
@Component({
  selector: 'app-convocatoria-editar-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50" (click)="onCerrar()"></div>

      <!-- Panel -->
      <div class="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-4xl">

        <!-- Cabecera -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#1F2133] rounded-t-xl">
          <div>
            <h2 class="text-white font-bold text-lg">Gestión de Convocatoria</h2>
            @if (conv()) {
              <p class="text-gray-400 text-xs mt-0.5">
                E9 — {{ conv()!.numeroConvocatoria }} · Estado:
                <span class="font-semibold text-yellow-300">{{ conv()!.estado }}</span>
              </p>
            }
          </div>
          <button
            (click)="onCerrar()"
            class="text-gray-400 hover:text-white transition-colors text-xl font-bold leading-none"
            aria-label="Cerrar modal">
            ✕
          </button>
        </div>

        @if (loading()) {
          <div class="px-6 py-16 text-center text-gray-400">
            <span class="animate-spin inline-block mr-2">⟳</span> Cargando datos...
          </div>
        } @else if (conv()) {

          <form [formGroup]="form" (ngSubmit)="onActualizar()" class="divide-y divide-gray-100">

            <!-- ── Sección: Selección de requerimiento ── -->
            <div class="px-6 py-5">
              <h3 class="text-sm font-bold text-[#1F2133] uppercase tracking-wide mb-4">
                Selección de requerimiento
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="label-field">Requerimiento configurado <span class="text-red-500">*</span></label>
                  <div class="input-field input-field--readonly">
                    {{ conv()!.requerimiento?.numeroRequerimiento || '—' }}
                    @if (req()) { — {{ getNombrePuesto() }} }
                  </div>
                </div>
                <div>
                  <label class="label-field">N° CAS autogenerado</label>
                  <div class="input-field input-field--readonly">{{ conv()!.numeroConvocatoria }}</div>
                </div>
              </div>
            </div>

            <!-- ── Sección: Datos heredados ── -->
            <div class="px-6 py-5 bg-gray-50">
              <h3 class="text-sm font-bold text-[#1F2133] uppercase tracking-wide mb-1">
                Datos heredados del requerimiento
              </h3>
              <p class="text-xs text-blue-600 mb-4">Información de solo lectura del perfil asociado.</p>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="label-field">Nombre del puesto</label>
                  <div class="input-field input-field--readonly">{{ getNombrePuesto() || '—' }}</div>
                </div>
                <div>
                  <label class="label-field">Unidad orgánica</label>
                  <div class="input-field input-field--readonly">{{ req()?.perfil?.unidadOrganica || '—' }}</div>
                </div>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div>
                  <label class="label-field">Remuneración mensual</label>
                  <div class="input-field input-field--readonly">{{ remuneracionDisplay() }}</div>
                </div>
                <div>
                  <label class="label-field">Lugar de prestación</label>
                  <div class="input-field input-field--readonly">{{ req()?.perfil?.condicion?.lugarPrestacion || '—' }}</div>
                </div>
                <div>
                  <label class="label-field">Duración contrato</label>
                  <div class="input-field input-field--readonly">{{ req()?.perfil?.condicion?.duracionContrato || '—' }}</div>
                </div>
                <div>
                  <label class="label-field">Estado requerimiento</label>
                  <div class="input-field input-field--readonly">{{ req()?.estado || '—' }}</div>
                </div>
                <div>
                  <label class="label-field">Puestos requeridos</label>
                  <div class="input-field input-field--readonly">{{ req()?.cantidadPuestos ?? '—' }}</div>
                </div>
              </div>

              <!-- Barra pesos Motor RF-14 -->
              <div class="mt-2">
                <div class="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">
                  Pesos Motor RF-14 (Heredados)
                </div>
                <div class="flex h-3 rounded-full overflow-hidden w-full" aria-label="Pesos heredados del motor RF-14">
                  <div [style.width.%]="pesoCurricular()" style="background:#1e40af"></div>
                  <div [style.width.%]="pesoTecnica()" style="background:#7c3aed"></div>
                  <div [style.width.%]="pesoEntrevista()" style="background:#D4A843"></div>
                </div>
                <div class="flex gap-4 mt-1 text-xs text-gray-600">
                  <span><span class="inline-block w-2 h-2 rounded-full mr-1" style="background:#1e40af"></span>Curricular {{ pesoCurricular() }}%</span>
                  <span><span class="inline-block w-2 h-2 rounded-full mr-1" style="background:#7c3aed"></span>Técnica {{ pesoTecnica() }}%</span>
                  <span><span class="inline-block w-2 h-2 rounded-full mr-1" style="background:#D4A843"></span>Entrevista {{ pesoEntrevista() }}%</span>
                </div>
              </div>
            </div>

            <!-- ── Sección: Datos editables ── -->
            <div class="px-6 py-5">
              <h3 class="text-sm font-bold text-[#1F2133] uppercase tracking-wide mb-1">
                Datos de la convocatoria
              </h3>
              <p class="text-xs text-blue-600 mb-4">Editables por ORH — D.S. 075-2008-PCM.</p>

              <div class="space-y-4">
                <div>
                  <label for="modal-descripcion" class="label-field">
                    Descripción <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    id="modal-descripcion"
                    formControlName="descripcion"
                    class="input-field"
                    rows="3"
                    maxlength="500"
                    aria-label="Descripción de la convocatoria"></textarea>
                  @if (form.controls['descripcion'].touched && form.controls['descripcion'].invalid) {
                    <span class="text-xs text-red-500">La descripción es obligatoria (máx. 500 caracteres).</span>
                  }
                </div>

                <div>
                  <label for="modal-objeto" class="label-field">Objeto de contratación</label>
                  <textarea
                    id="modal-objeto"
                    formControlName="objetoContratacion"
                    class="input-field"
                    rows="3"
                    maxlength="2000"
                    aria-label="Objeto de contratación"></textarea>
                </div>
              </div>
            </div>

            <!-- ── Acciones ── -->
            <div class="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                (click)="onCerrar()"
                class="btn-ghost">
                Cerrar
              </button>
              <button
                type="submit"
                class="btn-primary"
                [disabled]="saving() || form.invalid">
                @if (saving()) { <span class="animate-spin mr-1">⟳</span> }
                Actualizar
              </button>
            </div>

          </form>
        }
      </div>
    </div>
  `,
})
export class ConvocatoriaEditarModalComponent implements OnInit {
  readonly idConvocatoria = input.required<number>();
  readonly cerrado = output<boolean>();

  private readonly convService = inject(ConvocatoriaService);
  private readonly reqService = inject(RequerimientoService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly conv = signal<ConvocatoriaResponse | null>(null);
  readonly req = signal<RequerimientoResponse | null>(null);

  readonly pesoCurricular = computed(() => this.conv()?.pesoEvalCurricular ?? 0);
  readonly pesoTecnica = computed(() => this.conv()?.pesoEvalTecnica ?? 0);
  readonly pesoEntrevista = computed(() => this.conv()?.pesoEntrevista ?? 0);

  readonly remuneracionDisplay = computed(() => {
    const r = this.req()?.perfil?.condicion?.remuneracionMensual;
    if (r == null) return '—';
    return 'S/ ' + Number(r).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });

  readonly form = this.fb.group({
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
    objetoContratacion: ['', [Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    this.convService.obtener(this.idConvocatoria())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const c = res.data;
          this.conv.set(c);
          this.form.patchValue({
            descripcion: c.descripcion ?? '',
            objetoContratacion: c.objetoContratacion ?? '',
          });
          // Cargar detalle del requerimiento para datos heredados
          const idReq = c.requerimiento?.idRequerimiento;
          if (idReq) {
            this.reqService.obtener(idReq)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (rr) => { this.req.set(rr.data); this.loading.set(false); },
                error: () => this.loading.set(false),
              });
          } else {
            this.loading.set(false);
          }
        },
        error: () => {
          this.toast.error('No se pudo cargar la convocatoria.');
          this.loading.set(false);
          this.cerrado.emit(false);
        },
      });
  }

  getNombrePuesto(): string {
    const p = this.req()?.perfil;
    return p?.nombrePuesto || p?.denominacion || '';
  }

  onActualizar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.convService.actualizar(this.idConvocatoria(), {
      descripcion: raw['descripcion']!.trim(),
      objetoContratacion: raw['objetoContratacion']?.trim() || undefined,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Se actualizó correctamente');
          this.cerrado.emit(true);
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('Error al actualizar la convocatoria.');
        },
      });
  }

  onCerrar(): void {
    this.cerrado.emit(false);
  }
}
