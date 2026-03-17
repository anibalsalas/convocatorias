import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  | 'POSTULACION'
  | 'EVALUACION_CURRICULAR'
  | 'EVALUACION_TECNICA'
  | 'ENTREVISTA'
  | 'RESULTADOS';

interface StageRange {
  inicio: string;
  fin: string;
}

const ETAPAS_ORDENADAS: EtapaCronograma[] = [
  'POSTULACION',
  'EVALUACION_CURRICULAR',
  'EVALUACION_TECNICA',
  'ENTREVISTA',
  'RESULTADOS',
];

const ETIQUETAS_ETAPA: Record<EtapaCronograma, string> = {
  POSTULACION: 'Postulación',
  EVALUACION_CURRICULAR: 'Evaluación Curricular',
  EVALUACION_TECNICA: 'Evaluación Técnica',
  ENTREVISTA: 'Entrevista',
  RESULTADOS: 'Resultados',
};

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
        subtitle="E10 — Registrar actividades, fechas y responsables del proceso CAS.">
        <a routerLink="/sistema/convocatoria" class="btn-ghost" aria-label="Volver a listado de convocatorias">← Volver</a>
      </app-page-header>

      @if (loadingConvocatoria()) {
        <div class="card text-center py-12 text-gray-400" role="status" aria-live="polite">Cargando convocatoria...</div>
      } @else {
        <div class="space-y-6">
          <!-- Tabla de actividades guardadas -->
          <div class="card">
            <h3 class="font-semibold text-gray-800 mb-4" id="tabla-actividades">Actividades registradas</h3>
            <p class="text-sm text-gray-500 mb-4">
              La etapa de <strong>Postulación</strong> debe contemplar al menos
              <strong>10 días hábiles estimados</strong>. Las demás etapas se validan por coherencia cronológica.
            </p>

            @if (actividadesGuardadas().length === 0) {
              <div class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No hay actividades registradas. Agregue la primera actividad en el formulario.
              </div>
            } @else {
              <div class="overflow-x-auto" role="region" aria-labelledby="tabla-actividades">
                <table class="w-full text-sm text-left" aria-label="Lista de actividades del cronograma">
                  <thead class="text-gray-600 border-b border-gray-200">
                    <tr>
                      <th scope="col" class="py-3 px-4 font-medium">Etapa</th>
                      <th scope="col" class="py-3 px-4 font-medium">Actividad</th>
                      <th scope="col" class="py-3 px-4 font-medium">Fecha inicio</th>
                      <th scope="col" class="py-3 px-4 font-medium">Fecha fin</th>
                      <th scope="col" class="py-3 px-4 font-medium">Responsable</th>
                      <th scope="col" class="py-3 px-4 font-medium">Lugar</th>
                      <th scope="col" class="py-3 px-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (act of actividadesGuardadas(); track act.idCronograma) {
                      <tr class="border-b border-gray-100 hover:bg-gray-50/50" [class.bg-amber-50]="editingId() === act.idCronograma">
                        <td class="py-3 px-4">{{ etiquetaEtapa(act.etapa) }}</td>
                        <td class="py-3 px-4">{{ act.actividad }}</td>
                        <td class="py-3 px-4">{{ act.fechaInicio }}</td>
                        <td class="py-3 px-4">{{ act.fechaFin }}</td>
                        <td class="py-3 px-4">{{ act.responsable || '—' }}</td>
                        <td class="py-3 px-4">{{ act.lugar || '—' }}</td>
                        <td class="py-3 px-4">
                          <button type="button" class="btn-ghost text-sm text-[#2D5F8A] hover:underline"
                                  (click)="onEditarActividad(act)"
                                  [disabled]="editingId() !== null && editingId() !== act.idCronograma"
                                  [attr.aria-label]="'Editar actividad ' + act.actividad">
                            Editar
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <!-- Formulario para agregar/editar actividad -->
          @if (mostrarFormularioActividad()) {
            <form [formGroup]="form" (ngSubmit)="onGuardarActividad()" class="card space-y-4">
              <h4 class="font-semibold text-gray-800">{{ editingId() ? 'Editar actividad' : 'Agregar actividad' }}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="etapa" class="label-field">Etapa *</label>
                  <select id="etapa" formControlName="etapa" class="input-field" aria-required="true" aria-describedby="etapa-help"
                          [disabled]="!!editingId()">
                    @for (etapa of etapasDisponibles(); track etapa) {
                      <option [value]="etapa">{{ etiquetaEtapa(etapa) }}</option>
                    }
                  </select>
                  <span id="etapa-help" class="sr-only">Solo puede registrar una actividad por etapa</span>
                </div>
                <div>
                  <label for="actividad" class="label-field">Actividad *</label>
                  <input
                    id="actividad"
                    formControlName="actividad"
                    class="input-field"
                    maxlength="200"
                    placeholder="Ej. Publicación de resultados preliminares"
                    aria-required="true" />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label for="fechaInicio" class="label-field">Fecha inicio *</label>
                  <input id="fechaInicio" formControlName="fechaInicio" type="date" class="input-field" aria-required="true" />
                </div>
                <div>
                  <label for="fechaFin" class="label-field">Fecha fin *</label>
                  <input id="fechaFin" formControlName="fechaFin" type="date" class="input-field" aria-required="true" />
                </div>
                <div>
                  <label for="responsable" class="label-field">Responsable</label>
                  <input id="responsable" formControlName="responsable" class="input-field" maxlength="120" placeholder="ORH / Comité" />
                </div>
                <div>
                  <label for="lugar" class="label-field">Lugar</label>
                  <input id="lugar" formControlName="lugar" class="input-field" maxlength="150" placeholder="Virtual o sede" />
                </div>
              </div>

              @if (formRangeError()) {
                <p class="text-xs text-red-600" role="alert">La fecha fin no puede ser anterior a la fecha inicio.</p>
              }
              @if (formChronologyError()) {
                <p class="text-xs text-red-600" role="alert">{{ formChronologyError() }}</p>
              }

              <div class="flex gap-3">
                <button type="submit" class="btn-primary" [disabled]="saving() || !form.valid">
                  {{ saving() ? 'Guardando...' : (editingId() ? 'Guardar cambios' : 'Agregar actividad') }}
                </button>
                @if (editingId()) {
                  <button type="button" class="btn-ghost" (click)="onCancelarEdicion()">Cancelar</button>
                }
              </div>
            </form>
          }

          <!-- Resumen postulación -->
          <div class="card grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <div class="text-sm text-gray-500">Inicio de postulación</div>
              <div class="font-semibold text-gray-800">{{ postulacionInicio() || '—' }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Fin de postulación</div>
              <div class="font-semibold text-gray-800">{{ postulacionFin() || '—' }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Días hábiles de postulación</div>
              <div class="font-semibold"
                   [class.text-green-700]="postulacionBusinessDays() >= 10"
                   [class.text-red-600]="postulacionBusinessDays() < 10">
                {{ postulacionBusinessDays() }} día(s)
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

          <div class="flex items-center justify-end gap-3">
            <a routerLink="/sistema/convocatoria" class="btn-ghost">Cancelar</a>
            <button type="button" class="btn-primary"
                    [disabled]="!puedeContinuarComite()"
                    (click)="onContinuarComite()">
              Guardar y continuar a Comité
            </button>
          </div>
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

  readonly idConvocatoria = Number(this.route.snapshot.paramMap.get('id'));
  readonly convocatoria = signal<ConvocatoriaResponse | null>(null);
  readonly loadingConvocatoria = signal(true);
  readonly saving = signal(false);
  readonly globalError = signal('');
  readonly actividadesGuardadas = signal<ActividadCronogramaResponse[]>([]);
  readonly editingId = signal<number | null>(null);

  readonly form = this.fb.group({
    etapa: this.fb.nonNullable.control<EtapaCronograma>('POSTULACION', Validators.required),
    actividad: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    fechaInicio: this.fb.nonNullable.control('', Validators.required),
    fechaFin: this.fb.nonNullable.control('', Validators.required),
    responsable: this.fb.control<string | null>('ORH'),
    lugar: this.fb.control<string | null>(null),
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

  readonly todasActividadesParaValidar = computed(() => {
    const idEdit = this.editingId();
    const guardadas = this.actividadesGuardadas()
      .filter((a) => a.idCronograma !== idEdit)
      .map((a) => ({ etapa: a.etapa, fechaInicio: a.fechaInicio, fechaFin: a.fechaFin }));
    const formVal = this.formValue();
    if (formVal?.fechaInicio && formVal?.fechaFin) {
      guardadas.push({
        etapa: formVal.etapa,
        fechaInicio: formVal.fechaInicio,
        fechaFin: formVal.fechaFin,
      });
    }
    return guardadas;
  });

  readonly postulacionInicio = computed(() => this.getStageRange('POSTULACION').inicio);
  readonly postulacionFin = computed(() => this.getStageRange('POSTULACION').fin);

  readonly postulacionBusinessDays = computed(() => {
    const inicio = this.postulacionInicio();
    const fin = this.postulacionFin();
    if (!inicio || !fin) return 0;
    return this.calculateBusinessDays(inicio, fin);
  });

  readonly formRangeError = computed(() => {
    const v = this.formValue();
    if (!v?.fechaInicio || !v?.fechaFin) return false;
    return v.fechaInicio > v.fechaFin;
  });

  readonly formChronologyError = computed(() => this.validateFormChronology());

  readonly cronogramaCompleto = computed(() => {
    const guardadas = this.actividadesGuardadas();
    if (guardadas.length !== 5) return false;
    return !this.validateBusinessRulesFromItems(guardadas);
  });

  readonly estadoCronograma = computed(() => {
    const n = this.actividadesGuardadas().length;
    if (n === 0) return 'Agregue las 5 etapas del cronograma en orden.';
    if (n < 5) {
      const faltan = ETAPAS_ORDENADAS.filter(
        (e) => !this.actividadesGuardadas().some((a) => a.etapa === e),
      );
      return `Faltan etapas: ${faltan.map((e) => ETIQUETAS_ETAPA[e]).join(', ')}.`;
    }
    const err = this.validateBusinessRulesFromItems(this.actividadesGuardadas());
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
        next: (res) => {
          this.convocatoria.set(res.data);
          this.loadingConvocatoria.set(false);
        },
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

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const v = this.form.getRawValue();
      this.formValue.set({
        etapa: v.etapa,
        fechaInicio: v.fechaInicio,
        fechaFin: v.fechaFin,
      });
    });
    this.formValue.set({
      etapa: this.form.getRawValue().etapa,
      fechaInicio: this.form.getRawValue().fechaInicio,
      fechaFin: this.form.getRawValue().fechaFin,
    });
  }

  etiquetaEtapa(etapa: string): string {
    return ETIQUETAS_ETAPA[etapa as EtapaCronograma] ?? etapa;
  }

  onEditarActividad(act: ActividadCronogramaResponse): void {
    this.editingId.set(act.idCronograma);
    this.form.patchValue({
      etapa: act.etapa as EtapaCronograma,
      actividad: act.actividad,
      fechaInicio: act.fechaInicio,
      fechaFin: act.fechaFin,
      responsable: act.responsable ?? 'ORH',
      lugar: act.lugar ?? null,
    });
    this.formValue.set({
      etapa: act.etapa as EtapaCronograma,
      fechaInicio: act.fechaInicio,
      fechaFin: act.fechaFin,
    });
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
    const idEdit = this.editingId();
    const guardadas = this.actividadesGuardadas();

    const merged = idEdit
      ? guardadas.map((a, i) =>
          a.idCronograma === idEdit
            ? {
                etapa: formVal.etapa,
                actividad: formVal.actividad.trim(),
                fechaInicio: formVal.fechaInicio,
                fechaFin: formVal.fechaFin,
                responsable: formVal.responsable?.trim() ?? null,
                lugar: formVal.lugar?.trim() ?? null,
                orden: i + 1,
              }
            : {
                etapa: a.etapa,
                actividad: a.actividad,
                fechaInicio: a.fechaInicio,
                fechaFin: a.fechaFin,
                responsable: a.responsable ?? null,
                lugar: a.lugar ?? null,
                orden: i + 1,
              },
        )
      : [
          ...guardadas.map((a, i) => ({
            etapa: a.etapa,
            actividad: a.actividad,
            fechaInicio: a.fechaInicio,
            fechaFin: a.fechaFin,
            responsable: a.responsable ?? null,
            lugar: a.lugar ?? null,
            orden: i + 1,
          })),
          {
            etapa: formVal.etapa,
            actividad: formVal.actividad.trim(),
            fechaInicio: formVal.fechaInicio,
            fechaFin: formVal.fechaFin,
            responsable: formVal.responsable?.trim() ?? null,
            lugar: formVal.lugar?.trim() ?? null,
            orden: guardadas.length + 1,
          },
        ];

    const payload: CronogramaRequest = { actividades: merged };
    this.saving.set(true);
    this.convocatoriaService.registrarCronograma(this.idConvocatoria, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success(this.editingId() ? 'Actividad actualizada correctamente.' : 'Actividad agregada correctamente.');
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
      .subscribe({
        next: (res) => this.actividadesGuardadas.set(res.data ?? []),
      });
  }

  private resetFormForNext(): void {
    const primeraDisponible = this.etapasDisponibles()[0];
    this.form.reset({
      etapa: primeraDisponible ?? 'POSTULACION',
      actividad: '',
      fechaInicio: '',
      fechaFin: '',
      responsable: 'ORH',
      lugar: null,
    });
  }

  private getStageRange(etapa: EtapaCronograma): StageRange {
    const items = this.todasActividadesParaValidar().filter(
      (item) => item.etapa === etapa && item.fechaInicio && item.fechaFin,
    );
    if (items.length === 0) return { inicio: '', fin: '' };
    const inicios = items.map((i) => i.fechaInicio).sort();
    const fines = items.map((i) => i.fechaFin).sort();
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
    if (formVal.fechaInicio < rangoAnt.fechaFin) {
      return `La etapa ${ETIQUETAS_ETAPA[formVal.etapa]} debe iniciar después del ${rangoAnt.fechaFin} (fin de ${ETIQUETAS_ETAPA[etapaAnterior]}).`;
    }
    return '';
  }

  private validateBusinessRulesForMerge(): string {
    const v = this.form.getRawValue();
    const idEdit = this.editingId();
    const base = this.actividadesGuardadas()
      .filter((a) => a.idCronograma !== idEdit)
      .map((a) => ({ etapa: a.etapa, fechaInicio: a.fechaInicio, fechaFin: a.fechaFin }));
    const merged = [...base, { etapa: v.etapa, fechaInicio: v.fechaInicio, fechaFin: v.fechaFin }];
    return this.validateBusinessRulesFromItems(merged);
  }

  private validateBusinessRulesFromItems(items: { etapa: string; fechaInicio: string; fechaFin: string }[]): string {
    const postulacion = items.find((i) => i.etapa === 'POSTULACION');
    if (!postulacion?.fechaInicio || !postulacion?.fechaFin) {
      return 'Debe registrar la etapa de Postulación con fecha de inicio y fecha de fin.';
    }
    const dias = this.calculateBusinessDays(postulacion.fechaInicio, postulacion.fechaFin);
    if (dias < 10) {
      return 'La etapa de Postulación debe contemplar al menos 10 días hábiles estimados (D.S. 065-2011-PCM).';
    }
    let finAnterior = '';
    for (const etapa of ETAPAS_ORDENADAS) {
      const item = items.find((i) => i.etapa === etapa);
      if (!item?.fechaInicio || !item?.fechaFin) continue;
      if (finAnterior && item.fechaInicio < finAnterior) {
        const idx = ETAPAS_ORDENADAS.indexOf(etapa);
        const etapaAnt = ETAPAS_ORDENADAS[idx - 1];
        return `La etapa ${ETIQUETAS_ETAPA[etapa]} no puede iniciar antes de que finalice ${ETIQUETAS_ETAPA[etapaAnt]}.`;
      }
      finAnterior = item.fechaFin;
    }
    return '';
  }

  private calculateBusinessDays(start: string, end: string): number {
    let count = 0;
    const current = new Date(`${start}T00:00:00`);
    const finish = new Date(`${end}T00:00:00`);
    while (current <= finish) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count += 1;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }
}
