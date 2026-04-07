import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { RequerimientoService } from '../../services/requerimiento.service';
import { RequerimientoResponse, ConfigurarReglasRequest } from '../../models/requerimiento.model';
import { ApiResponse } from '@shared/models/api-response.model';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-motor-reglas',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header title="Motor de Reglas RF-14" [estado]="req()?.estado"
        subtitle="ORH — Configurar pesos ponderados y umbrales (CK_CONV_PESOS: suma = 100%)">
        <a routerLink="/sistema/requerimiento/requerimientos" class="btn-ghost">← Volver</a>
      </app-page-header>
      <p class="text-sm text-red-500">* Luego de Configurar el Motor de Reglas,  Sirvase Crear la Convocatoria</p>
      @if (loading()) {
        <div class="card text-center py-12 text-gray-400">Cargando requerimiento...</div>
      } @else if (req()) {
        <form [formGroup]="form" (ngSubmit)="onConfigurar()" class="space-y-6">
          <!-- Pesos ponderados con barras visuales -->
          <div class="card space-y-5">
            <h3 class="font-semibold text-gray-800">Distribución de Pesos (debe sumar 100%)</h3>

            <!-- Barra total visual -->
            <div class="mb-4">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium" [class]="totalPesos() === 100 ? 'text-green-700' : 'text-red-600'">
                  Total: {{ totalPesos() }}%
                </span>
                <span class="text-xs" [class]="totalPesos() === 100 ? 'text-green-600' : 'text-red-500'">
                  {{ totalPesos() === 100 ? '✅ CK_CONV_PESOS válido' : '⚠️ Debe sumar exactamente 100%' }}
                </span>
              </div>
              <div class="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                <div class="h-full bg-blue-500 transition-all duration-300" [style.width.%]="pesoCurr()"></div>
                <div class="h-full bg-purple-500 transition-all duration-300" [style.width.%]="pesoTec()"></div>
                <div class="h-full bg-orange-500 transition-all duration-300" [style.width.%]="pesoEnt()"></div>
              </div>
              <div class="flex justify-between text-xs mt-1 text-gray-500">
                <span>🔵 Curricular {{ pesoCurr() }}%</span>
                <span>🟣 Técnica {{ pesoTec() }}%</span>
                <span>🟠 Entrevista {{ pesoEnt() }}%</span>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="label-field">Peso Eval. Curricular (%) *</label>
                <input formControlName="pesoEvalCurricular" type="text" inputmode="numeric" maxlength="2"
                  class="input-field" placeholder="1–99"
                  (input)="filtrarEntero($event, form.controls.pesoEvalCurricular, 1, 99)" />
              </div>
              <div>
                <label class="label-field">Peso Eval. Técnica (%) *</label>
                <input formControlName="pesoEvalTecnica" type="text" inputmode="numeric" maxlength="2"
                  class="input-field" placeholder="1–99"
                  (input)="filtrarEntero($event, form.controls.pesoEvalTecnica, 1, 99)" />
              </div>
              <div>
                <label class="label-field">Peso Entrevista (%) *</label>
                <input formControlName="pesoEntrevista" type="text" inputmode="numeric" maxlength="2"
                  class="input-field" placeholder="1–99"
                  (input)="filtrarEntero($event, form.controls.pesoEntrevista, 1, 99)" />
              </div>
            </div>
          </div>

          <!-- Umbrales mínimos -->
          <div class="card space-y-4">
            <h3 class="font-semibold text-gray-800">Umbrales Mínimos de Aprobación</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="label-field">Umbral Curricular *</label>
                <input formControlName="umbralCurricular" type="text" inputmode="decimal" maxlength="6"
                  class="input-field" placeholder="0–100"
                  (input)="filtrarDecimal($event, form.controls.umbralCurricular, 100)" />
              </div>
              <div>
                <label class="label-field">Umbral Técnica *</label>
                <input formControlName="umbralTecnica" type="text" inputmode="decimal" maxlength="6"
                  class="input-field" placeholder="0–100"
                  (input)="filtrarDecimal($event, form.controls.umbralTecnica, 100)" />
              </div>
              <div>
                <label class="label-field">Umbral Entrevista *</label>
                <input formControlName="umbralEntrevista" type="text" inputmode="decimal" maxlength="6"
                  class="input-field" placeholder="0–100"
                  (input)="filtrarDecimal($event, form.controls.umbralEntrevista, 100)" />
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button type="submit" [disabled]="saving() || totalPesos() !== 100" class="btn-primary">
              @if (saving()) { <span class="animate-spin mr-1">⟳</span> }
              Configurar Motor de Reglas
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class MotorReglasComponent implements OnInit {
  private svc = inject(RequerimientoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  req = signal<RequerimientoResponse | null>(null);
  loading = signal(true);
  saving = signal(false);

  form = this.fb.group({
    pesoEvalCurricular: [30, [Validators.required, Validators.min(1), Validators.max(99)]],
    pesoEvalTecnica: [35, [Validators.required, Validators.min(1), Validators.max(99)]],
    pesoEntrevista: [35, [Validators.required, Validators.min(1), Validators.max(99)]],
    umbralCurricular: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    umbralTecnica: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    umbralEntrevista: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  pesoCurr = signal(30);
  pesoTec = signal(35);
  pesoEnt = signal(35);
  totalPesos = computed(() => this.pesoCurr() + this.pesoTec() + this.pesoEnt());

  ngOnInit(): void {
    const id = +this.route.snapshot.params['id'];
    this.svc.obtener(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<RequerimientoResponse>) => { this.req.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    // Sync signals with form values
    this.form.get('pesoEvalCurricular')?.valueChanges.subscribe(v => this.pesoCurr.set(v ?? 0));
    this.form.get('pesoEvalTecnica')?.valueChanges.subscribe(v => this.pesoTec.set(v ?? 0));
    this.form.get('pesoEntrevista')?.valueChanges.subscribe(v => this.pesoEnt.set(v ?? 0));
  }

  filtrarEntero(event: Event, ctrl: FormControl, min: number, max: number): void {
    const input = event.target as HTMLInputElement;
    const soloDigitos = input.value.replace(/[^0-9]/g, '').slice(0, 2);
    const num = soloDigitos === '' ? null : Math.min(Math.max(Number(soloDigitos), min), max);
    input.value = num !== null ? String(num) : '';
    ctrl.setValue(num, { emitEvent: true });
    ctrl.updateValueAndValidity();
  }

  filtrarDecimal(event: Event, ctrl: FormControl, max: number): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1').slice(0, 6);
    const num = limpio === '' || limpio === '.' ? null : Math.min(parseFloat(limpio), max);
    input.value = limpio;
    ctrl.setValue(num !== null ? num : null, { emitEvent: true });
    ctrl.updateValueAndValidity();
  }

  onConfigurar(): void {
    if (this.totalPesos() !== 100) { this.toast.error('Los pesos deben sumar exactamente 100% (CK_CONV_PESOS)'); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    const id = this.req()!.idRequerimiento;
    const raw = this.form.getRawValue();
    const body: ConfigurarReglasRequest = {
      pesoEvalCurricular: raw.pesoEvalCurricular!,
      pesoEvalTecnica: raw.pesoEvalTecnica!,
      pesoEntrevista: raw.pesoEntrevista!,
      umbralCurricular: raw.umbralCurricular!,
      umbralTecnica: raw.umbralTecnica!,
      umbralEntrevista: raw.umbralEntrevista!,
      criteriosCurriculares: [],
    };

    this.svc.configurarReglas(id, body).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Motor de reglas configurado → CONFIGURADO');
        this.router.navigate(['/sistema/requerimiento/requerimientos']);
      },
      error: () => this.saving.set(false),
    });
  }
}
