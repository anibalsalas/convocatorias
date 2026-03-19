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
        <!-- Resumen del requerimiento — todos los campos son solo lectura para OPP -->
        <div class="card space-y-4">
          <div class="flex items-center justify-between border-b pb-3">
            <h2 class="font-semibold text-gray-800">Resumen del requerimiento</h2>
            <span class="text-xs font-mono bg-gray-100 text-[#1F2133] font-semibold px-2 py-1 rounded">
              N°: {{ req()!.numeroRequerimiento }}
            </span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <p class="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Nombre del puesto</p>
              <p class="font-semibold text-gray-800">{{ req()!.perfil.nombrePuesto || req()!.perfil.denominacion || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Unidad orgánica</p>
              <p class="font-semibold text-gray-800">{{ req()!.perfil.unidadOrganica || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Cantidad de puestos</p>
              <p class="font-semibold text-gray-800">{{ req()!.cantidadPuestos }}</p>
            </div>
            <div></div>
            <div>
              <p class="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Remuneración mensual</p>
              <p class="font-semibold text-gray-800">{{ formatRemuneracion(req()!.perfil.condicion?.remuneracionMensual) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Duración del contrato</p>
              <p class="font-semibold text-gray-800">{{ req()!.perfil.condicion?.duracionContrato || '—' }}</p>
            </div>
            <div class="md:col-span-2">
              <p class="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Justificación</p>
              <p class="text-gray-700">{{ req()!.justificacion || '—' }}</p>
            </div>
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
              Registrar Verificación y Notificar al Área Solicitante y ORH
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

  formatRemuneracion(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
