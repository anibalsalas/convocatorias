import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ConvocatoriaService } from '../../services/convocatoria.service';
import {
  ActividadCronogramaResponse,
  ConvocatoriaResponse,
  CronogramaRequest,
} from '../../models/convocatoria.model';

type EtapaCronograma =
  | 'PUBLICACION'
  | 'POSTULACION'
  | 'EVAL_CURRICULAR'
  | 'RESULT_CURRICULAR'
  | 'EVAL_TECNICA'
  | 'RESULT_TECNICA'
  | 'ENTREVISTA'
  | 'RESULTADO'
  | 'SUSCRIPCION';

interface StageRange {
  inicio: string;
  fin: string;
}

const ETAPAS_ORDENADAS: EtapaCronograma[] = [
  'PUBLICACION',
  'POSTULACION',
  'EVAL_CURRICULAR',
  'RESULT_CURRICULAR',
  'EVAL_TECNICA',
  'RESULT_TECNICA',
  'ENTREVISTA',
  'RESULTADO',
  'SUSCRIPCION',
];

const ETIQUETAS_ETAPA: Record<EtapaCronograma, string> = {
  PUBLICACION:      'Publicación',
  POSTULACION:      'Postulación',
  EVAL_CURRICULAR:  'Evaluación Curricular',
  RESULT_CURRICULAR:'Resultados Curriculares',
  EVAL_TECNICA:     'Evaluación Técnica',
  RESULT_TECNICA:   'Resultados Técnicos',
  ENTREVISTA:       'Entrevista Personal',
  RESULTADO:        'Resultado Final',
  SUSCRIPCION:      'Suscripción de Contrato',
};

/** Etapas de un solo día: fechaInicio debe ser igual a fechaFin */
const FECHA_UNICA_ETAPAS: readonly EtapaCronograma[] = ['EVAL_TECNICA', 'ENTREVISTA'];

const AREAS_RESPONSABLES: readonly string[] = [
  'ORH',
  'Comité de Selección',
  'OPP',
  'OGA',
  'OI',
  'Secretaría General',
  'Dirección General',
];

@Component({
  selector: 'app-cronograma',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Cronograma de Convocatoria"
        [estado]="convocatoria()?.estado"
        subtitle="Registrar las 9 etapas, fechas y áreas responsables del proceso CAS.">
        <a routerLink="/sistema/convocatoria" class="btn-ghost" aria-label="Volver a listado de convocatorias">← Volver</a>
      </app-page-header>

      @if (modoLectura) {
        <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Solo lectura — la convocatoria ya fue publicada. No se pueden realizar cambios.
        </div>
      }

      @if (loadingConvocatoria()) {
        <div class="card text-center py-12 text-gray-400" role="status" aria-live="polite">Cargando convocatoria...</div>
      } @else {
        <div class="space-y-6">

          <!-- Tabla de actividades guardadas -->
          <div class="card">
            <h3 class="font-semibold text-gray-800 mb-2" id="tabla-actividades">Actividades registradas</h3>
            <p class="text-sm text-gray-500 mb-4">
              La <strong>Publicación</strong> debe durar al menos <strong>10 días hábiles</strong> y mantenerse
              <strong>5 días hábiles</strong> antes del inicio de Postulación (D.S. 065-2011-PCM).
              Las etapas <strong>Evaluación Técnica</strong> e <strong>Entrevista Personal</strong> se realizan en un solo día.
            </p>

            @if (actividadesGuardadas().length === 0) {
              <div class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No hay actividades registradas. Agregue la primera etapa en el formulario.
              </div>
            } @else {
              <div class="overflow-x-auto" role="region" aria-labelledby="tabla-actividades">
                <table class="w-full text-sm text-left" aria-label="Lista de actividades del cronograma">
                  <thead class="text-gray-600 border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th scope="col" class="py-3 px-3 font-medium">Etapa</th>
                      <th scope="col" class="py-3 px-3 font-medium">Actividad</th>
                      <th scope="col" class="py-3 px-3 font-medium">Fecha inicio</th>
                      <th scope="col" class="py-3 px-3 font-medium">Fecha fin</th>
                      <th scope="col" class="py-3 px-3 font-medium">Áreas responsables</th>
                      <th scope="col" class="py-3 px-3 font-medium">Lugar</th>
                      <th scope="col" class="py-3 px-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (act of actividadesGuardadas(); track act.idCronograma) {
                      <tr class="border-b border-gray-100 hover:bg-gray-50/50"
                          [class.bg-amber-50]="editingId() === act.idCronograma">
                        <td class="py-3 px-3 font-medium text-[#2D5F8A]">{{ etiquetaEtapa(act.etapa) }}</td>
                        <td class="py-3 px-3">{{ act.actividad }}</td>
                        <td class="py-3 px-3 font-mono text-xs">{{ act.fechaInicio }}</td>
                        <td class="py-3 px-3 font-mono text-xs">
                          @if (esFechaUnica(act.etapa)) {
                            <span class="text-purple-600">{{ act.fechaInicio }} <span class="text-xs text-gray-400">(día único)</span></span>
                          } @else {
                            {{ act.fechaFin }}
                          }
                        </td>
                        <td class="py-3 px-3 text-xs text-gray-700">
                          {{ formatAreas(act.areaResp1, act.areaResp2, act.areaResp3) }}
                        </td>
                        <td class="py-3 px-3 text-xs">{{ lugarLabel(act.lugar) }}</td>
                        <td class="py-3 px-3">
                          @if (!modoLectura) {
                            <button type="button" class="btn-ghost text-sm text-[#2D5F8A] hover:underline"
                                    (click)="onEditarActividad(act)"
                                    [disabled]="editingId() !== null && editingId() !== act.idCronograma"
                                    [attr.aria-label]="'Editar actividad ' + act.actividad">
                              Editar
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <!-- Formulario para agregar/editar actividad -->
          @if (!modoLectura && mostrarFormularioActividad()) {
            <form [formGroup]="form" (ngSubmit)="onGuardarActividad()" class="card space-y-4">
              <h4 class="font-semibold text-gray-800">{{ editingId() ? 'Editar etapa' : 'Agregar etapa' }}</h4>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="etapa" class="label-field">Etapa *</label>
                  <select id="etapa" formControlName="etapa" class="input-field" aria-required="true"
                          [attr.disabled]="!!editingId() ? true : null">
                    @for (etapa of etapasDisponibles(); track etapa) {
                      <option [value]="etapa">{{ etiquetaEtapa(etapa) }}</option>
                    }
                  </select>
                  @if (form.controls.etapa.touched && form.controls.etapa.errors?.['required']) {
                    <p class="text-xs text-red-500 mt-1" role="alert">Seleccione una etapa.</p>
                  }
                </div>
                <div>
                  <label for="actividad" class="label-field">Actividad *</label>
                  <input id="actividad" formControlName="actividad" class="input-field" maxlength="200"
                         placeholder="Ej. Publicación en portal institucional y Talento Perú" aria-required="true" />
                  @if (form.controls.actividad.touched && form.controls.actividad.errors) {
                    @if (form.controls.actividad.errors['required'] || form.controls.actividad.errors['pattern']) {
                      <p class="text-xs text-red-500 mt-1" role="alert">Ingrese la descripción de la actividad.</p>
                    } @else if (form.controls.actividad.errors['maxlength']) {
                      <p class="text-xs text-red-500 mt-1" role="alert">Máximo 200 caracteres.</p>
                    }
                  }
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label for="fechaInicio" class="label-field">Fecha inicio *</label>
                  <input id="fechaInicio" formControlName="fechaInicio" type="date" class="input-field" aria-required="true" />
                  @if (form.controls.fechaInicio.touched && form.controls.fechaInicio.errors?.['required']) {
                    <p class="text-xs text-red-500 mt-1" role="alert">Seleccione la fecha de inicio.</p>
                  }
                  @if (formFechaInicioError()) {
                    <p class="text-xs text-red-500 mt-1" role="alert">{{ formFechaInicioError() }}</p>
                  }
                </div>
                <div>
                  <label for="fechaFin" class="label-field">
                    Fecha fin *
                    @if (esFechaUnicaActual()) {
                      <span class="ml-1 text-xs font-normal text-purple-600">(día único — auto)</span>
                    }
                  </label>
                  <input id="fechaFin" formControlName="fechaFin" type="date" class="input-field"
                         [attr.readonly]="esFechaUnicaActual() ? true : null" aria-required="true" />
                  @if (!esFechaUnicaActual() && form.controls.fechaFin.touched && form.controls.fechaFin.errors?.['required']) {
                    <p class="text-xs text-red-500 mt-1" role="alert">Seleccione la fecha de fin.</p>
                  }
                </div>
                <div class="lg:col-span-2">
                  <label for="lugar" class="label-field">Lugar</label>
                  <select id="lugar" formControlName="lugar" class="input-field">
                    <option [value]="null">— Sin especificar —</option>
                    <option value="V">Virtual</option>
                    <option value="S">Sede institucional</option>
                  </select>
                </div>
              </div>

              <!-- Áreas responsables (3 selects independientes) -->
              <div>
                <p class="label-field mb-2">Áreas responsables <span class="text-red-500">*</span></p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label for="areaResp1" class="text-xs text-gray-500 mb-1 block">Área 1 *</label>
                    <select id="areaResp1" formControlName="areaResp1" class="input-field" aria-required="true">
                      <option [value]="null">— Sin asignar —</option>
                      @for (area of areas; track area) {
                        <option [value]="area">{{ area }}</option>
                      }
                    </select>
                    @if (form.controls.areaResp1.touched && form.controls.areaResp1.errors?.['required']) {
                      <p class="text-xs text-red-500 mt-1" role="alert">Seleccione al menos un área responsable.</p>
                    }
                  </div>
                  <div>
                    <label for="areaResp2" class="text-xs text-gray-500 mb-1 block">Área 2</label>
                    <select id="areaResp2" formControlName="areaResp2" class="input-field">
                      <option [value]="null">— Sin asignar —</option>
                      @for (area of areas; track area) {
                        <option [value]="area">{{ area }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label for="areaResp3" class="text-xs text-gray-500 mb-1 block">Área 3</label>
                    <select id="areaResp3" formControlName="areaResp3" class="input-field">
                      <option [value]="null">— Sin asignar —</option>
                      @for (area of areas; track area) {
                        <option [value]="area">{{ area }}</option>
                      }
                    </select>
                  </div>
                </div>
                @if (areasDuplicadas()) {
                  <p class="text-xs text-red-500 mt-2" role="alert">Las áreas responsables no deben repetirse.</p>
                }
              </div>

              @if (formRangeError()) {
                <p class="text-xs text-red-600" role="alert">La fecha fin no puede ser anterior a la fecha inicio.</p>
              }
              @if (formChronologyError()) {
                <p class="text-xs text-red-600" role="alert">{{ formChronologyError() }}</p>
              }

              <div class="flex gap-3">
                <button type="submit" class="btn-primary"
                        [disabled]="saving() || !form.valid || formRangeError() || !!formChronologyError() || areasDuplicadas() || !!formFechaInicioError()">
                  {{ saving() ? 'Guardando...' : (editingId() ? 'Guardar cambios' : 'Agregar etapa') }}
                </button>
                @if (editingId()) {
                  <button type="button" class="btn-ghost" (click)="onCancelarEdicion()">Cancelar</button>
                }
              </div>
            </form>
          }

          <!-- Resumen validaciones -->
          <div class="card space-y-3">
            <h4 class="text-sm font-semibold text-gray-700">Validaciones del cronograma</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div class="text-xs text-gray-500">Inicio publicación</div>
                <div class="font-semibold text-gray-800">{{ publicacionInicio() || '—' }}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500">Fin publicación</div>
                <div class="font-semibold text-gray-800">{{ publicacionFin() || '—' }}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500">Días hábiles publicación</div>
                <div class="font-semibold"
                     [class.text-green-700]="publicacionDiasHabiles() >= 10"
                     [class.text-red-600]="publicacionDiasHabiles() > 0 && publicacionDiasHabiles() < 10"
                     [class.text-gray-400]="publicacionDiasHabiles() === 0">
                  {{ publicacionDiasHabiles() > 0 ? publicacionDiasHabiles() + ' día(s)' : '—' }}
                  @if (publicacionDiasHabiles() >= 10) { <span class="text-xs">✓</span> }
                </div>
              </div>
              <div>
                <div class="text-xs text-gray-500">Gap pub → post (hábiles)</div>
                <div class="font-semibold"
                     [class.text-green-700]="gapPublicacionPostulacion() >= 5"
                     [class.text-red-600]="gapPublicacionPostulacion() > 0 && gapPublicacionPostulacion() < 5"
                     [class.text-gray-400]="gapPublicacionPostulacion() === 0">
                  {{ gapPublicacionPostulacion() > 0 ? gapPublicacionPostulacion() + ' día(s)' : '—' }}
                  @if (gapPublicacionPostulacion() >= 5) { <span class="text-xs">✓</span> }
                </div>
              </div>
            </div>
          </div>

          @if (estadoCronograma()) {
            <div class="rounded-lg border px-4 py-3 text-sm"
                 [class.border-amber-200]="!cronogramaCompleto()"
                 [class.bg-amber-50]="!cronogramaCompleto()"
                 [class.text-amber-800]="!cronogramaCompleto()"
                 [class.border-green-200]="cronogramaCompleto()"
                 [class.bg-green-50]="cronogramaCompleto()"
                 [class.text-green-800]="cronogramaCompleto()"
                 role="status">
              {{ estadoCronograma() }}
            </div>
          }

          @if (globalError()) {
            <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {{ globalError() }}
            </div>
          }

          @if (!modoLectura) {
            <div class="flex items-center justify-end gap-3">
              <a routerLink="/sistema/convocatoria" class="btn-ghost">Cancelar</a>
              <button type="button" class="btn-primary"
                      [disabled]="!puedeContinuarComite()"
                      (click)="onContinuarComite()">
                Guardar y continuar crear Comité
              </button>
            </div>
          }

        </div>
      }
    </div>
  `,
})
export class CronogramaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly convocatoriaService = inject(ConvocatoriaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly areas = AREAS_RESPONSABLES;

  readonly idConvocatoria = Number(this.route.snapshot.paramMap.get('id'));
  readonly modoLectura = this.route.snapshot.queryParamMap.get('modo') === 'lectura';
  readonly convocatoria = signal<ConvocatoriaResponse | null>(null);
  readonly loadingConvocatoria = signal(true);
  readonly saving = signal(false);
  readonly globalError = signal('');
  readonly actividadesGuardadas = signal<ActividadCronogramaResponse[]>([]);
  readonly editingId = signal<number | null>(null);

  readonly form = this.fb.group({
    etapa:     this.fb.nonNullable.control<EtapaCronograma>('PUBLICACION', Validators.required),
    actividad: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(200)]),
    fechaInicio: this.fb.nonNullable.control('', Validators.required),
    fechaFin:    this.fb.nonNullable.control('', Validators.required),
    areaResp1: this.fb.control<string | null>(null, Validators.required),
    areaResp2: this.fb.control<string | null>(null),
    areaResp3: this.fb.control<string | null>(null),
    lugar:     this.fb.control<string | null>(null),
  });

  readonly etapasUsadasExcluyendoEdicion = computed(() => {
    const id = this.editingId();
    return this.actividadesGuardadas()
      .filter((a) => a.idCronograma !== id)
      .map((a) => a.etapa as EtapaCronograma);
  });

  readonly etapasDisponibles = computed(() =>
    ETAPAS_ORDENADAS.filter((e) => !this.etapasUsadasExcluyendoEdicion().includes(e)),
  );

  readonly mostrarFormularioActividad = computed(() =>
    this.editingId() !== null || this.etapasDisponibles().length > 0,
  );

  private readonly formValue = signal<{ etapa: EtapaCronograma; fechaInicio: string; fechaFin: string } | null>(null);
  private readonly formAreasValue = signal<{ a1: string | null; a2: string | null; a3: string | null }>({ a1: null, a2: null, a3: null });

  readonly todasActividadesParaValidar = computed(() => {
    const idEdit = this.editingId();
    const guardadas = this.actividadesGuardadas()
      .filter((a) => a.idCronograma !== idEdit)
      .map((a) => ({ etapa: a.etapa, fechaInicio: String(a.fechaInicio), fechaFin: String(a.fechaFin) }));
    const formVal = this.formValue();
    if (formVal?.fechaInicio && formVal?.fechaFin) {
      guardadas.push({ etapa: formVal.etapa, fechaInicio: formVal.fechaInicio, fechaFin: formVal.fechaFin });
    }
    return guardadas;
  });

  readonly publicacionInicio = computed(() => this.getStageRange('PUBLICACION').inicio);
  readonly publicacionFin    = computed(() => this.getStageRange('PUBLICACION').fin);

  readonly publicacionDiasHabiles = computed(() => {
    const ini = this.publicacionInicio();
    const fin = this.publicacionFin();
    if (!ini || !fin) return 0;
    return this.calculateBusinessDays(ini, fin);
  });

  readonly gapPublicacionPostulacion = computed(() => {
    const pubFin  = this.publicacionFin();
    const postIni = this.getStageRange('POSTULACION').inicio;
    if (!pubFin || !postIni) return 0;
    return this.calculateBusinessDaysFrom(pubFin, postIni);
  });

  readonly formRangeError = computed(() => {
    const v = this.formValue();
    if (!v?.fechaInicio || !v?.fechaFin) return false;
    return v.fechaInicio > v.fechaFin;
  });

  readonly formChronologyError = computed(() => this.validateFormChronology());

  readonly esFechaUnicaActual = computed(() =>
    FECHA_UNICA_ETAPAS.includes(this.form.controls.etapa.value),
  );

  /** true si hay áreas duplicadas entre los 3 selects — usa signal reactiva, no getRawValue() */
  readonly areasDuplicadas = computed(() => {
    const { a1, a2, a3 } = this.formAreasValue();
    const areas = [a1, a2, a3].filter(Boolean);
    return areas.length !== new Set(areas).size;
  });

  /** Fecha de inicio no puede ser anterior a hoy (solo para nuevas etapas, no edición) */
  readonly formFechaInicioError = computed(() => {
    if (this.editingId()) return '';
    const val = this.formValue()?.fechaInicio;
    if (!val) return '';
    const today = new Date().toISOString().substring(0, 10);
    return val < today ? 'La fecha de inicio no puede ser anterior a la fecha actual.' : '';
  });

  readonly cronogramaCompleto = computed(() => {
    const guardadas = this.actividadesGuardadas();
    if (guardadas.length !== 9) return false;
    return !this.validateBusinessRulesFromItems(
      guardadas.map((a) => ({ etapa: a.etapa, fechaInicio: String(a.fechaInicio), fechaFin: String(a.fechaFin) })),
    );
  });

  readonly estadoCronograma = computed(() => {
    const n = this.actividadesGuardadas().length;
    if (n === 0) return 'Agregue las 9 etapas del cronograma en orden.';
    if (n < 9) {
      const faltan = ETAPAS_ORDENADAS.filter(
        (e) => !this.actividadesGuardadas().some((a) => a.etapa === e),
      );
      return `Faltan etapas: ${faltan.map((e) => ETIQUETAS_ETAPA[e]).join(', ')}.`;
    }
    const err = this.validateBusinessRulesFromItems(
      this.actividadesGuardadas().map((a) => ({ etapa: a.etapa, fechaInicio: String(a.fechaInicio), fechaFin: String(a.fechaFin) })),
    );
    if (err) return err;
    return 'Cronograma completo. Puede continuar a Comité.';
  });

  readonly puedeContinuarComite = computed(() => this.cronogramaCompleto());

  constructor() {
    if (!Number.isFinite(this.idConvocatoria) || this.idConvocatoria <= 0) {
      this.loadingConvocatoria.set(false);
      this.globalError.set('Identificador de convocatoria inválido.');
      return;
    }

    this.convocatoriaService.obtener(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => { this.convocatoria.set(res.data); this.loadingConvocatoria.set(false); },
        error: (err: { error?: { error?: string; message?: string } }) => {
          this.loadingConvocatoria.set(false);
          this.globalError.set(err.error?.error ?? err.error?.message ?? 'No se pudo cargar la convocatoria.');
        },
      });

    this.convocatoriaService.obtenerCronograma(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.actividadesGuardadas.set(res.data ?? []),
        error: () => this.actividadesGuardadas.set([]),
      });

    // Sincronizar formValue para computed de validación
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const v = this.form.getRawValue();
      this.formValue.set({ etapa: v.etapa, fechaInicio: v.fechaInicio, fechaFin: v.fechaFin });
      this.formAreasValue.set({ a1: v.areaResp1, a2: v.areaResp2, a3: v.areaResp3 });
    });
    const raw = this.form.getRawValue();
    this.formValue.set({ etapa: raw.etapa, fechaInicio: raw.fechaInicio, fechaFin: raw.fechaFin });
    this.formAreasValue.set({ a1: raw.areaResp1, a2: raw.areaResp2, a3: raw.areaResp3 });

    // Auto-sync fechaFin para etapas de día único
    this.form.controls.fechaInicio.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        if (FECHA_UNICA_ETAPAS.includes(this.form.controls.etapa.value) && val) {
          this.form.controls.fechaFin.setValue(val, { emitEvent: false });
        }
      });

    this.form.controls.etapa.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((etapa) => {
        if (FECHA_UNICA_ETAPAS.includes(etapa)) {
          const inicio = this.form.controls.fechaInicio.value;
          if (inicio) this.form.controls.fechaFin.setValue(inicio, { emitEvent: false });
        }
      });
  }

  etiquetaEtapa(etapa: string): string {
    return ETIQUETAS_ETAPA[etapa as EtapaCronograma] ?? etapa;
  }

  esFechaUnica(etapa: string): boolean {
    return FECHA_UNICA_ETAPAS.includes(etapa as EtapaCronograma);
  }

  lugarLabel(lugar?: string | null): string {
    if (lugar === 'V') return 'Virtual';
    if (lugar === 'S') return 'Sede institucional';
    return lugar || '—';
  }

  formatAreas(a1?: string | null, a2?: string | null, a3?: string | null): string {
    return [a1, a2, a3].filter(Boolean).join(' / ') || '—';
  }

  onEditarActividad(act: ActividadCronogramaResponse): void {
    this.editingId.set(act.idCronograma);
    this.form.patchValue({
      etapa:     act.etapa as EtapaCronograma,
      actividad: act.actividad,
      fechaInicio: String(act.fechaInicio),
      fechaFin:    String(act.fechaFin),
      areaResp1: act.areaResp1 ?? null,
      areaResp2: act.areaResp2 ?? null,
      areaResp3: act.areaResp3 ?? null,
      lugar:     act.lugar ?? null,
    });
    this.formValue.set({
      etapa:      act.etapa as EtapaCronograma,
      fechaInicio: String(act.fechaInicio),
      fechaFin:    String(act.fechaFin),
    });
    this.formAreasValue.set({ a1: act.areaResp1 ?? null, a2: act.areaResp2 ?? null, a3: act.areaResp3 ?? null });
    this.globalError.set('');
  }

  onCancelarEdicion(): void {
    this.editingId.set(null);
    this.resetFormForNext();
    this.globalError.set('');
  }

  onGuardarActividad(): void {
    this.globalError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Complete todos los campos obligatorios.');
      return;
    }
    if (this.formRangeError()) {
      this.globalError.set('La fecha fin no puede ser anterior a la fecha inicio.');
      return;
    }
    if (this.areasDuplicadas()) {
      this.globalError.set('Las áreas responsables no deben repetirse.');
      this.toast.warning('Las áreas responsables no deben repetirse.');
      return;
    }
    const chronologyErr = this.validateFormChronology();
    if (chronologyErr) {
      this.globalError.set(chronologyErr);
      this.toast.warning(chronologyErr);
      return;
    }
    const businessErr = this.validateBusinessRulesForMerge();
    if (businessErr) {
      this.globalError.set(businessErr);
      this.toast.warning(businessErr);
      return;
    }

    const formVal = this.form.getRawValue();
    const idEdit  = this.editingId();
    const guardadas = this.actividadesGuardadas();

    const toItem = (a: ActividadCronogramaResponse, orden: number) => ({
      etapa:      a.etapa,
      actividad:  a.actividad,
      fechaInicio: String(a.fechaInicio),
      fechaFin:    String(a.fechaFin),
      areaResp1:  a.areaResp1 ?? null,
      areaResp2:  a.areaResp2 ?? null,
      areaResp3:  a.areaResp3 ?? null,
      lugar:      a.lugar ?? null,
      orden,
    });

    const formItem = (orden: number) => ({
      etapa:      formVal.etapa,
      actividad:  formVal.actividad.trim(),
      fechaInicio: formVal.fechaInicio,
      fechaFin:    formVal.fechaFin,
      areaResp1:  formVal.areaResp1 ?? null,
      areaResp2:  formVal.areaResp2 ?? null,
      areaResp3:  formVal.areaResp3 ?? null,
      lugar:      formVal.lugar?.trim() ?? null,
      orden,
    });

    const merged = idEdit
      ? guardadas.map((a, i) => a.idCronograma === idEdit ? formItem(i + 1) : toItem(a, i + 1))
      : [...guardadas.map((a, i) => toItem(a, i + 1)), formItem(guardadas.length + 1)];

    const payload: CronogramaRequest = { actividades: merged };
    this.saving.set(true);
    this.convocatoriaService.registrarCronograma(this.idConvocatoria, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success(idEdit ? 'Etapa actualizada correctamente.' : 'Etapa agregada correctamente.');
          this.editingId.set(null);
          this.loadCronograma();
          this.resetFormForNext();
        },
        error: (err: { error?: { error?: string; message?: string } }) => {
          this.saving.set(false);
          const msg = err.error?.error ?? err.error?.message ?? 'No se pudo registrar el cronograma.';
          this.globalError.set(msg);
          this.toast.error(msg);
        },
      });
  }

  onContinuarComite(): void {
    if (!this.puedeContinuarComite()) return;
    this.router.navigate(['/sistema/convocatoria', this.idConvocatoria, 'comite']);
  }

  private loadCronograma(): void {
    this.convocatoriaService.obtenerCronograma(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (res) => this.actividadesGuardadas.set(res.data ?? []) });
  }

  private resetFormForNext(): void {
    const primera = this.etapasDisponibles()[0];
    this.form.reset({
      etapa:      primera ?? 'PUBLICACION',
      actividad:  '',
      fechaInicio: '',
      fechaFin:   '',
      areaResp1:  null,
      areaResp2:  null,
      areaResp3:  null,
      lugar:      null,
    });
  }

  private getStageRange(etapa: EtapaCronograma): StageRange {
    const items = this.todasActividadesParaValidar().filter(
      (item) => item.etapa === etapa && item.fechaInicio && item.fechaFin,
    );
    if (items.length === 0) return { inicio: '', fin: '' };
    const inicios = items.map((i) => i.fechaInicio).sort();
    const fines   = items.map((i) => i.fechaFin).sort();
    return { inicio: inicios[0] ?? '', fin: fines[fines.length - 1] ?? '' };
  }

  private validateFormChronology(): string {
    const formVal = this.formValue();
    if (!formVal?.fechaInicio || !formVal?.fechaFin) return '';
    const guardadas = this.actividadesGuardadas().filter((a) => a.idCronograma !== this.editingId());
    const idx = ETAPAS_ORDENADAS.indexOf(formVal.etapa);
    if (idx <= 0) return '';
    const etapaAnterior = ETAPAS_ORDENADAS[idx - 1];
    const rangoAnt = guardadas.find((a) => a.etapa === etapaAnterior);
    if (!rangoAnt) return '';
    // Postulación puede iniciar el mismo día que termina Publicación — sin restricción aquí
    if (formVal.etapa === 'POSTULACION' && etapaAnterior === 'PUBLICACION') return '';
    const fechaFinAnt = String(rangoAnt.fechaFin).substring(0, 10);
    if (formVal.fechaInicio < fechaFinAnt) {
      return `La etapa ${ETIQUETAS_ETAPA[formVal.etapa]} debe iniciar después del ${fechaFinAnt} (fin de ${ETIQUETAS_ETAPA[etapaAnterior]}).`;
    }
    return '';
  }

  private validateBusinessRulesForMerge(): string {
    const v = this.form.getRawValue();
    const idEdit = this.editingId();
    const base = this.actividadesGuardadas()
      .filter((a) => a.idCronograma !== idEdit)
      .map((a) => ({ etapa: a.etapa, fechaInicio: String(a.fechaInicio), fechaFin: String(a.fechaFin) }));
    const merged = [...base, { etapa: v.etapa, fechaInicio: v.fechaInicio, fechaFin: v.fechaFin }];
    return this.validateBusinessRulesFromItems(merged);
  }

  private validateBusinessRulesFromItems(items: { etapa: string; fechaInicio: string; fechaFin: string }[]): string {
    const publicacion = items.find((i) => i.etapa === 'PUBLICACION');
    if (!publicacion?.fechaInicio || !publicacion?.fechaFin) return '';

    // Regla 1: Publicación >= 10 días hábiles
    const diasPub = this.calculateBusinessDays(publicacion.fechaInicio, publicacion.fechaFin);
    if (diasPub < 10) {
      return `La Publicación debe contemplar al menos 10 días hábiles (D.S. 065-2011-PCM). Registrados: ${diasPub}.`;
    }


    // Regla 3: Evaluación Técnica y Entrevista deben ser de un solo día
    for (const etapa of FECHA_UNICA_ETAPAS) {
      const item = items.find((i) => i.etapa === etapa);
      if (item && item.fechaInicio !== item.fechaFin) {
        return `La etapa "${ETIQUETAS_ETAPA[etapa]}" debe realizarse en un solo día (fecha inicio = fecha fin).`;
      }
    }

    // Regla 4: coherencia cronológica
    let finAnterior = '';
    for (const etapa of ETAPAS_ORDENADAS) {
      const item = items.find((i) => i.etapa === etapa);
      if (!item?.fechaInicio || !item?.fechaFin) continue;
      const idxActual = ETAPAS_ORDENADAS.indexOf(etapa);
      const etapaAnt = ETAPAS_ORDENADAS[idxActual - 1];
      const esPostulacionTrasPub = etapa === 'POSTULACION' && etapaAnt === 'PUBLICACION';
      if (!esPostulacionTrasPub && finAnterior && item.fechaInicio < finAnterior) {
        return `La etapa ${ETIQUETAS_ETAPA[etapa]} no puede iniciar antes de que finalice ${ETIQUETAS_ETAPA[etapaAnt]}.`;
      }
      finAnterior = item.fechaFin;
    }
    return '';
  }

  /** Días hábiles inclusivos entre dos fechas ISO */
  private calculateBusinessDays(start: string, end: string): number {
    let count = 0;
    const current = new Date(`${start}T00:00:00`);
    const finish  = new Date(`${end}T00:00:00`);
    while (current <= finish) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count += 1;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  /** Días hábiles desde el día siguiente a pubFin hasta postIni (inclusive) */
  private calculateBusinessDaysFrom(pubFin: string, postIni: string): number {
    const start  = new Date(`${pubFin}T00:00:00`);
    start.setDate(start.getDate() + 1);
    const finish = new Date(`${postIni}T00:00:00`);
    if (start > finish) return 0;
    let count = 0;
    const current = new Date(start);
    while (current <= finish) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count += 1;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }
}
