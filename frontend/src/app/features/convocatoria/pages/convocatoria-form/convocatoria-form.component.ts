import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ApiResponse } from '@shared/models/api-response.model';
import { Page } from '@shared/models/pagination.model';

import { RequerimientoResponse } from '@features/requerimiento/models/requerimiento.model';
import { RequerimientoService } from '@features/requerimiento/services/requerimiento.service';

import { ConvocatoriaRequest } from '../../models/convocatoria.model';
import { ConvocatoriaService } from '../../services/convocatoria.service';

@Component({
  selector: 'app-convocatoria-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./convocatoria-form.component.css'],
  template: `
    <div class="convocatoria-form">
      <app-page-header
        title="Nueva convocatoria CAS"
        subtitle="E9 — Crear convocatoria desde requerimiento CONFIGURADO (D.S. 075-2008-PCM)">
        <a routerLink="/sistema/convocatoria" class="btn-ghost">← Volver</a>
      </app-page-header>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="convocatoria-form__form">
        <section class="card-section">
          <h2 class="section-title">Selección de requerimiento</h2>
          <div class="grid-form grid-form--two">
            <div>
              <label for="idRequerimiento" class="label-field">Requerimiento configurado <span class="text-red-500">*</span></label>
              <select
                id="idRequerimiento"
                formControlName="idRequerimiento"
                class="input-field"
                aria-label="Seleccionar requerimiento configurado">
                <option [ngValue]="null">— Seleccione un requerimiento CONFIGURADO —</option>
                @for (req of requerimientosConfigurados(); track req.idRequerimiento) {
                  <option [ngValue]="req.idRequerimiento">
                    {{ req.numeroRequerimiento }} — {{ getNombrePuesto(req) }}
                  </option>
                }
              </select>
              @if (loadingRequerimientos()) {
                <span class="helper-text">Cargando requerimientos...</span>
              }
              @if (!loadingRequerimientos() && requerimientosConfigurados().length === 0) {
                <span class="error-text">No hay requerimientos en estado CONFIGURADO.</span>
              }
              @if (form.controls.idRequerimiento.touched && form.controls.idRequerimiento.invalid) {
                <span class="error-text">Debe seleccionar un requerimiento.</span>
              }
            </div>
            <div>
              <label for="numeroConvocatoria" class="label-field">N° CAS autogenerado</label>
              <input
                id="numeroConvocatoria"
                type="text"
                class="input-field input-field--readonly"
                [value]="numeroConvocatoriaDisplay()"
                [attr.aria-label]="'Número de convocatoria autogenerado'"
                readonly />
            </div>
          </div>
        </section>

        <section class="card-section">
          <h2 class="section-title">Datos heredados del requerimiento</h2>
          <p class="section-subtitle">Información de solo lectura del perfil asociado.</p>
          @if (loadingDetail()) {
            <p class="helper-text">Cargando detalle del requerimiento...</p>
          } @else {
          <div class="grid-form grid-form--two">
            <div>
              <label class="label-field">Nombre del puesto</label>
              <div class="input-field input-field--readonly">{{ getNombrePuesto(selectedRequerimientoDetail()) || '—' }}</div>
            </div>
            <div>
              <label class="label-field">Unidad orgánica</label>
              <div class="input-field input-field--readonly">{{ selectedRequerimientoDetail()?.perfil?.unidadOrganica || '—' }}</div>
            </div>
          </div>
          <div class="grid-form grid-form--five">
            <div>
              <label class="label-field">Remuneración mensual</label>
              <div class="input-field input-field--readonly">{{ remuneracionMensualDisplay() }}</div>
            </div>
            <div>
              <label class="label-field">Lugar de prestación</label>
              <div class="input-field input-field--readonly">{{ selectedRequerimientoDetail()?.perfil?.condicion?.lugarPrestacion || '—' }}</div>
            </div>
            <div>
              <label class="label-field">Duración contrato</label>
              <div class="input-field input-field--readonly">{{ selectedRequerimientoDetail()?.perfil?.condicion?.duracionContrato || '—' }}</div>
            </div>
            <div>
              <label class="label-field">Estado requerimiento</label>
              <div class="input-field input-field--readonly">{{ selectedRequerimientoDetail()?.estado || '—' }}</div>
            </div>
            <div>
              <label class="label-field">Puestos requeridos</label>
              <div class="input-field input-field--readonly">{{ selectedRequerimientoDetail()?.cantidadPuestos ?? '—' }}</div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-bar__label">Pesos motor RF-14 (heredados)</div>
            <div class="progress-bar__track" aria-label="Pesos heredados del motor RF-14">
              <div [style.width.%]="pesoCurricular()" style="background:#1e40af"></div>
              <div [style.width.%]="pesoTecnica()" style="background:#7c3aed"></div>
              <div [style.width.%]="pesoEntrevista()" style="background:#D4A843"></div>
            </div>
            <div class="progress-bar__legend">
              <span class="progress-bar__item"><span class="progress-dot" style="background:#1e40af"></span> Curricular {{ pesoCurricular() }}%</span>
              <span class="progress-bar__item"><span class="progress-dot" style="background:#7c3aed"></span> Técnica {{ pesoTecnica() }}%</span>
              <span class="progress-bar__item"><span class="progress-dot" style="background:#D4A843"></span> Entrevista {{ pesoEntrevista() }}%</span>
            </div>
          </div>
          }
        </section>

        <section class="card-section">
          <h2 class="section-title">Datos de la convocatoria</h2>
          <p class="section-subtitle">Editables por ORH — D.S. 075-2008-PCM.</p>
          <div>
            <label for="descripcion" class="label-field">Descripción <span class="text-red-500">*</span></label>
            <textarea
              id="descripcion"
              formControlName="descripcion"
              class="input-field"
              rows="3"
              maxlength="500"
              placeholder="CAS N° 005-2026-ACFFAA — Especialista en ..."
              aria-label="Descripción de convocatoria"></textarea>
            @if (form.controls.descripcion.touched && form.controls.descripcion.invalid) {
              <span class="error-text">La descripción es obligatoria (máx. 500 caracteres).</span>
            }
          </div>
          <div>
            <label for="objetoContratacion" class="label-field">Objeto de contratación</label>
            <textarea
              id="objetoContratacion"
              formControlName="objetoContratacion"
              class="input-field"
              rows="3"
              maxlength="2000"
              placeholder="Contratación de un(01) Especialista ..."
              aria-label="Objeto de contratación"></textarea>
          </div>
          <div class="grid-form grid-form--three">
            <div>
              <label for="fechaPublicacion" class="label-field">Fecha publicación</label>
              <input id="fechaPublicacion" type="date" formControlName="fechaPublicacion" class="input-field" />
            </div>
            <div>
              <label for="fechaIniPostulacion" class="label-field">Inicio postulación <span class="text-red-500">*</span></label>
              <input id="fechaIniPostulacion" type="date" formControlName="fechaIniPostulacion" class="input-field" />
              @if (form.controls.fechaIniPostulacion.touched && form.controls.fechaIniPostulacion.invalid) {
                <span class="error-text">Obligatorio.</span>
              }
            </div>
            <div>
              <label for="fechaFinPostulacion" class="label-field">Fin postulación <span class="text-red-500">*</span></label>
              <input id="fechaFinPostulacion" type="date" formControlName="fechaFinPostulacion" class="input-field" />
              @if (form.controls.fechaFinPostulacion.touched && form.controls.fechaFinPostulacion.invalid) {
                <span class="error-text">Obligatorio.</span>
              }
            </div>
            <div>
              <label for="fechaEvaluacion" class="label-field">Fecha evaluación</label>
              <input id="fechaEvaluacion" type="date" formControlName="fechaEvaluacion" class="input-field" />
            </div>
            <div>
              <label for="fechaResultado" class="label-field">Fecha resultado</label>
              <input id="fechaResultado" type="date" formControlName="fechaResultado" class="input-field" />
            </div>
          </div>
          @if (dateError()) {
            <div class="info-box info-box--error mt-2">
              {{ dateError() }}
            </div>
          }
          <div class="info-box mt-2">
            El N° CAS se genera automáticamente con <strong>SEQ_NUM_CONVOCATORIA</strong>. Siguiente paso: cronograma detallado (E10).
          </div>
          <div class="form-actions">
            <a routerLink="/sistema/convocatoria" class="btn-ghost">Cancelar</a>
            <button type="submit" class="btn-primary" [disabled]="saving() || form.invalid || !!dateError() || !selectedRequerimientoDetail()">
              @if (saving()) { <span class="animate-spin mr-1">⟳</span> }
              Registrar y continuar
            </button>
          </div>
        </section>
      </form>
    </div>
  `,
})
export class ConvocatoriaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly convocatoriaService = inject(ConvocatoriaService);
  private readonly requerimientoService = inject(RequerimientoService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly requerimientosConfigurados = signal<RequerimientoResponse[]>([]);
  readonly loadingRequerimientos = signal(true);
  readonly loadingDetail = signal(false);
  readonly selectedRequerimientoDetail = signal<RequerimientoResponse | null>(null);
  readonly saving = signal(false);
  readonly loadingNumero = signal(false);
  readonly numeroConvocatoriaGenerada = signal('');

  readonly form = this.fb.group({
    idRequerimiento: [null as number | null, Validators.required],
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
    objetoContratacion: ['', [Validators.maxLength(2000)]],
    fechaPublicacion: [''],
    fechaIniPostulacion: ['', Validators.required],
    fechaFinPostulacion: ['', Validators.required],
    fechaEvaluacion: [''],
    fechaResultado: [''],
  });

  readonly numeroConvocatoriaDisplay = computed(() => {
    if (this.loadingNumero()) {
      return 'Generando correlativo...';
    }
    if (!this.selectedRequerimientoDetail()) {
      return 'CAS N° — (autogenerado)';
    }
    return this.toDisplayNumero(this.numeroConvocatoriaGenerada()) || 'CAS N° — (autogenerado)';
  });

  readonly pesoCurricular = computed(() => this.selectedRequerimientoDetail()?.motorReglas?.pesoEvalCurricular ?? 0);
  readonly pesoTecnica = computed(() => this.selectedRequerimientoDetail()?.motorReglas?.pesoEvalTecnica ?? 0);
  readonly pesoEntrevista = computed(() => this.selectedRequerimientoDetail()?.motorReglas?.pesoEntrevista ?? 0);

  readonly remuneracionMensualDisplay = computed(() => {
    const remuneracion = this.selectedRequerimientoDetail()?.perfil?.condicion?.remuneracionMensual;
    if (remuneracion === null || remuneracion === undefined) {
      return '—';
    }
    return this.formatMoney(remuneracion);
  });

  readonly dateError = computed(() => {
    const raw = this.form.getRawValue();
    const publicacion = raw.fechaPublicacion || '';
    const inicio = raw.fechaIniPostulacion || '';
    const fin = raw.fechaFinPostulacion || '';
    const evaluacion = raw.fechaEvaluacion || '';
    const resultado = raw.fechaResultado || '';

    if (publicacion && inicio && publicacion > inicio) {
      return 'La fecha de publicación no puede ser posterior al inicio de postulación.';
    }
    if (inicio && fin && inicio > fin) {
      return 'La fecha de inicio de postulación no puede ser mayor a la fecha de fin.';
    }
    if (fin && evaluacion && fin > evaluacion) {
      return 'La fecha de evaluación no puede ser anterior al fin de postulación.';
    }
    if (evaluacion && resultado && evaluacion > resultado) {
      return 'La fecha de resultado no puede ser anterior a la fecha de evaluación.';
    }
    return '';
  });

  ngOnInit(): void {
    this.loadConfiguredRequirements();
    this.watchRequirementSelection();
  }

  onSubmit(): void {
    if (this.form.invalid || this.dateError() || !this.selectedRequerimientoDetail()) {
      this.form.markAllAsTouched();
      if (this.dateError()) {
        this.toast.warning(this.dateError());
      }
      return;
    }

    const raw = this.form.getRawValue();
    const payload: ConvocatoriaRequest = {
      idRequerimiento: raw.idRequerimiento!,
      numeroConvocatoria: this.numeroConvocatoriaGenerada() || null,
      descripcion: (raw.descripcion ?? '').trim(),
      objetoContratacion: raw.objetoContratacion?.trim() || null,
      fechaPublicacion: raw.fechaPublicacion || null,
      fechaIniPostulacion: raw.fechaIniPostulacion || '',
      fechaFinPostulacion: raw.fechaFinPostulacion || '',
      fechaEvaluacion: raw.fechaEvaluacion || null,
      fechaResultado: raw.fechaResultado || null,
    };

    this.saving.set(true);
    this.convocatoriaService
      .crear(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.toast.success(response.message || 'Convocatoria registrada con estado EN_ELABORACION.');
          this.router.navigate(['/sistema/convocatoria', response.data.idConvocatoria, 'cronograma']);
        },
        error: (err: { error?: { message?: string } }) => {
          this.saving.set(false);
          this.toast.error(err.error?.message || 'No se pudo registrar la convocatoria.');
        },
      });
  }

  getNombrePuesto(req: RequerimientoResponse | null | undefined): string {
    return req?.perfil?.nombrePuesto || req?.perfil?.denominacion || '—';
  }

  private loadConfiguredRequirements(): void {
    this.requerimientoService
      .listar({ page: 0, size: 100, sort: 'fechaCreacion,desc' }, { estado: 'CONFIGURADO' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<Page<RequerimientoResponse>>) => {
          this.requerimientosConfigurados.set(response.data.content);
          this.loadingRequerimientos.set(false);
        },
        error: () => {
          this.requerimientosConfigurados.set([]);
          this.loadingRequerimientos.set(false);
          this.toast.error('No se pudo cargar la lista de requerimientos CONFIGURADOS.');
        },
      });
  }

  private watchRequirementSelection(): void {
    this.form.controls.idRequerimiento.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((idRequerimiento) => {
        if (!idRequerimiento) {
          this.selectedRequerimientoDetail.set(null);
          this.loadingDetail.set(false);
          this.numeroConvocatoriaGenerada.set('');
          this.form.patchValue(
            {
              descripcion: '',
              objetoContratacion: '',
              fechaPublicacion: '',
              fechaIniPostulacion: '',
              fechaFinPostulacion: '',
              fechaEvaluacion: '',
              fechaResultado: '',
            },
            { emitEvent: false },
          );
          this.form.markAsPristine();
          return;
        }

        this.loadingDetail.set(true);
        this.requerimientoService
          .obtener(idRequerimiento)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (response: ApiResponse<RequerimientoResponse>) => {
              this.selectedRequerimientoDetail.set(response.data);
              this.loadingDetail.set(false);
              if (!this.numeroConvocatoriaGenerada()) {
                this.reservarSiguienteNumero();
              } else {
                this.applySuggestedTexts();
              }
            },
            error: () => {
              this.loadingDetail.set(false);
              this.selectedRequerimientoDetail.set(null);
              this.toast.error('No se pudo cargar el detalle del requerimiento.');
            },
          });
      });
  }

  private reservarSiguienteNumero(): void {
    this.loadingNumero.set(true);
    this.convocatoriaService
      .obtenerSiguienteNumero()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.numeroConvocatoriaGenerada.set(response.data);
          this.loadingNumero.set(false);
          this.applySuggestedTexts();
        },
        error: () => {
          this.loadingNumero.set(false);
          this.toast.error('No se pudo generar el correlativo automático de la convocatoria.');
        },
      });
  }

  private applySuggestedTexts(): void {
    const requerimiento = this.selectedRequerimientoDetail();
    if (!requerimiento) {
      return;
    }

    const descripcionControl = this.form.controls.descripcion;
    const objetoControl = this.form.controls.objetoContratacion;

    if (!descripcionControl.dirty || !(descripcionControl.value ?? '').trim()) {
      descripcionControl.setValue(this.buildSuggestedDescription(requerimiento), { emitEvent: false });
      descripcionControl.markAsPristine();
    }

    if (!objetoControl.dirty || !(objetoControl.value ?? '').trim()) {
      objetoControl.setValue(this.buildSuggestedObject(requerimiento), { emitEvent: false });
      objetoControl.markAsPristine();
    }
  }

  private buildSuggestedDescription(requerimiento: RequerimientoResponse): string {
    const numero = this.toDisplayNumero(this.numeroConvocatoriaGenerada());
    const puesto = this.getNombrePuesto(requerimiento);
    return numero ? `${numero} — ${puesto}` : puesto;
  }

  private buildSuggestedObject(requerimiento: RequerimientoResponse): string {
    const cantidad = requerimiento.cantidadPuestos ?? 1;
    const puesto = this.getNombrePuesto(requerimiento);
    const unidad = requerimiento.perfil?.unidadOrganica || 'unidad orgánica solicitante';
    return `Contratación de ${this.buildCantidadTexto(cantidad)} ${puesto} para la ${unidad}.`;
  }

  private buildCantidadTexto(cantidad: number): string {
    if (cantidad === 1) {
      return 'un(01)';
    }
    const padded = String(cantidad).padStart(2, '0');
    return `${cantidad}(${padded})`;
  }

  private formatMoney(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private toDisplayNumero(rawNumber: string): string {
    if (!rawNumber) {
      return '';
    }
    const match = rawNumber.match(/^CAS-(\d+)-(\d{4})$/i);
    if (!match) {
      return rawNumber;
    }
    return `CAS N° ${match[1]}-${match[2]}-ACFFAA`;
  }
}
