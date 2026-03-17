import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { RequerimientoService } from '../../services/requerimiento.service';
import { RequerimientoResponse, VerificarPresupuestoRequest } from '../../models/requerimiento.model';
import { ApiResponse } from '@shared/models/api-response.model';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

/** Límites según BD: TBL_REQUERIMIENTO (CERTIFICACION_PRESUPUESTAL=50, NUMERO_SIAF=30). Observaciones: 500. */
const MAX_CERTIFICACION = 50;
const MAX_NUMERO_SIAF = 30;
const MAX_OBSERVACIONES = 500;
const PATRON_ALFANUM_GUION = /^[A-Z0-9\-]*$/;

@Component({
  selector: 'app-presupuesto-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header title="Verificación Presupuestal" [estado]="req()?.estado"
        subtitle="OPP — Gateway ¿Existen recursos presupuestales?">
        <a routerLink="/sistema/requerimiento/requerimientos" class="btn-ghost">← Volver</a>
      </app-page-header>

      @if (loading()) {
        <div class="card text-center py-12 text-gray-400">Cargando requerimiento...</div>
      } @else if (req()) {
        <div class="card space-y-3">
          <h2 class="font-semibold text-gray-800">{{ req()!.perfil.denominacion }}</h2>
          <p class="text-sm text-gray-600">{{ req()!.justificacion }}</p>
          <div class="flex gap-6 text-sm">
            <span><strong>N°:</strong> {{ req()!.numeroRequerimiento }}</span>
            <span><strong>Puestos:</strong> {{ req()!.cantidadPuestos }}</span>
          </div>
        </div>

        <div class="card space-y-5">
          <h3 class="font-semibold text-gray-800">Decisión presupuestal</h3>

          <div class="flex gap-6">
            <label class="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 transition-all"
              [class]="existePresupuesto() ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'">
              <input type="radio" [checked]="existePresupuesto()" (click)="existePresupuesto.set(true)" class="accent-green-600 w-5 h-5" />
              <div>
                <div class="font-semibold text-green-700">✅ Sí, existen recursos</div>
                <div class="text-xs text-gray-500">Emitir certificación presupuestal</div>
              </div>
            </label>
            <label class="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 transition-all"
              [class]="!existePresupuesto() ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'">
              <input type="radio" [checked]="!existePresupuesto()" (click)="existePresupuesto.set(false)" class="accent-red-600 w-5 h-5" />
              <div>
                <div class="font-semibold text-red-700">❌ No hay presupuesto</div>
                <div class="text-xs text-gray-500">Estado terminal: SIN_PRESUPUESTO</div>
              </div>
            </label>
          </div>

          @if (existePresupuesto()) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label class="label-field">N° Certificación Presupuestal *</label>
                <input [formControl]="form.controls.certificacionPresupuestal" class="input-field" placeholder="CERT-2026-0001"
                  [attr.maxlength]="maxCertificacion" [attr.aria-label]="'Numero certificacion presupuestal'"
                  (input)="onCertificacionInput($event)" />
                @if (form.controls.certificacionPresupuestal.invalid && form.controls.certificacionPresupuestal.touched) {
                  <span class="error-text">Solo letras, números y guión. Máx. {{ maxCertificacion }} caracteres.</span>
                }
              </div>
              <div>
                <label class="label-field">N° Operación SIAF-SP *</label>
                <input [formControl]="form.controls.numeroSiaf" class="input-field" placeholder="SIAF-2026-00001"
                  [attr.maxlength]="maxNumeroSiaf" [attr.aria-label]="'Numero operacion SIAF-SP'"
                  (input)="onNumeroSiafInput($event)" />
                @if (form.controls.numeroSiaf.invalid && form.controls.numeroSiaf.touched) {
                  <span class="error-text">Solo letras, números y guión. Máx. {{ maxNumeroSiaf }} caracteres.</span>
                }
              </div>
            </div>
          }

          <div>
            <label class="label-field">Observaciones</label>
            <textarea [formControl]="form.controls.observaciones" class="input-field" rows="3"
              placeholder="Observaciones de la verificación presupuestal..."
              [attr.maxlength]="maxObservaciones" [attr.aria-label]="'Observaciones'"></textarea>
          </div>

          <div class="flex justify-end">
            <button (click)="onVerificar()" [disabled]="saving()" class="btn-primary">
              @if (saving()) { <span class="animate-spin mr-1">⟳</span> }
              Registrar Verificación
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class PresupuestoFormComponent implements OnInit {
  private svc = inject(RequerimientoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  req = signal<RequerimientoResponse | null>(null);
  loading = signal(true);
  saving = signal(false);
  existePresupuesto = signal(true);

  readonly maxCertificacion = MAX_CERTIFICACION;
  readonly maxNumeroSiaf = MAX_NUMERO_SIAF;
  readonly maxObservaciones = MAX_OBSERVACIONES;

  form = this.fb.nonNullable.group({
    certificacionPresupuestal: ['', [Validators.maxLength(MAX_CERTIFICACION), Validators.pattern(PATRON_ALFANUM_GUION)]],
    numeroSiaf: ['', [Validators.maxLength(MAX_NUMERO_SIAF), Validators.pattern(PATRON_ALFANUM_GUION)]],
    observaciones: ['', [Validators.maxLength(MAX_OBSERVACIONES)]],
  });

  onCertificacionInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = this.sanitizeAlfanumGuion(input.value, MAX_CERTIFICACION);
    if (input.value !== sanitized) {
      this.form.controls.certificacionPresupuestal.setValue(sanitized, { emitEvent: false });
    }
  }

  onNumeroSiafInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = this.sanitizeAlfanumGuion(input.value, MAX_NUMERO_SIAF);
    if (input.value !== sanitized) {
      this.form.controls.numeroSiaf.setValue(sanitized, { emitEvent: false });
    }
  }

  private sanitizeAlfanumGuion(value: string, maxLen: number): string {
    const upper = value.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
    return upper.slice(0, maxLen);
  }

  ngOnInit(): void {
    const id = +this.route.snapshot.params['id'];
    this.svc.obtener(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<RequerimientoResponse>) => { this.req.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onVerificar(): void {
    if (this.existePresupuesto() && (!this.form.value.certificacionPresupuestal || !this.form.value.numeroSiaf)) {
      this.toast.warning('Ingrese N° Certificación y N° SIAF');
      return;
    }
    this.saving.set(true);
    const id = this.req()!.idRequerimiento;
    const body: VerificarPresupuestoRequest = {
      existePresupuesto: this.existePresupuesto(),
      certificacionPresupuestal: this.existePresupuesto() ? this.form.value.certificacionPresupuestal : undefined,
      numeroSiaf: this.existePresupuesto() ? this.form.value.numeroSiaf : undefined,
      observaciones: this.form.value.observaciones || undefined,
    };
    this.svc.verificarPresupuesto(id, body).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.existePresupuesto() ? 'Presupuesto certificado → CON_PRESUPUESTO' : 'Registrado como SIN_PRESUPUESTO');
        this.router.navigate(['/sistema/requerimiento/requerimientos']);
      },
      error: () => this.saving.set(false),
    });
  }
}
