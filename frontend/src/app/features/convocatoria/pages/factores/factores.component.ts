import { NgForOf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ConvocatoriaService } from '../../services/convocatoria.service';
import {
  ConvocatoriaResponse,
  FactorDetalleResponse,
  FactorFactorRequest,
} from '../../models/convocatoria.model';
import { ApiResponse } from '@shared/models/api-response.model';

const MAX_FACTORES = 3;

const ETIQUETAS_FASE: Record<string, string> = {
  CURRICULAR: 'Evaluación curricular',
  TECNICA: 'Evaluación técnica',
  ENTREVISTA: 'Entrevista Personal',
};

@Component({
  selector: 'app-factores',
  standalone: true,
  imports: [NgForOf, ReactiveFormsModule, RouterLink, PageHeaderComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Factores de Evaluación"
        [estado]="convocatoria()?.estado"
        subtitle="E12 — Registrar fases y subcriterios. Máx. 3 fases. Peso total 100%.">
        <a routerLink="/sistema/convocatoria" class="btn-ghost">← Volver</a>
      </app-page-header>

      @if (modoLectura) {
        <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Solo lectura — la convocatoria ya fue publicada. No se pueden realizar cambios.
        </div>
      }

      @if (loading()) {
        <div class="card text-center py-12 text-gray-400">Cargando...</div>
      } @else {
        <!-- Pesos definidos en la convocatoria (referencia) -->
        @if (convocatoria()) {
          <div class="card bg-blue-50 border border-blue-200">
            <p class="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Pesos de evaluación (definidos en la convocatoria)</p>
            <div class="flex flex-wrap gap-4 text-sm">
              <span class="inline-flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                <span class="text-gray-600">Evaluación Curricular:</span>
                <span class="font-semibold text-blue-800">{{ convocatoria()!.pesoEvalCurricular ?? '—' }}%</span>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                <span class="text-gray-600">Evaluación Técnica:</span>
                <span class="font-semibold text-indigo-800">{{ convocatoria()!.pesoEvalTecnica ?? '—' }}%</span>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-violet-400"></span>
                <span class="text-gray-600">Entrevista Personal:</span>
                <span class="font-semibold text-violet-800">{{ convocatoria()!.pesoEntrevista ?? '—' }}%</span>
              </span>
            </div>
          </div>
        }

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- FORMULARIO: agregar / editar fase o subcriterio        -->
        <!-- ═══════════════════════════════════════════════════════ -->
        @if (!modoLectura) {
        <div class="card space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">
              {{ editandoFactor() ? 'Editar factor' : (agregandoSubcriterioDe() ? 'Agregar subcriterio a «' + (agregandoSubcriterioDe()?.criterio ?? '') + '»' : '+ Agregar fase') }}
            </h3>
            @if (editandoFactor() || agregandoSubcriterioDe()) {
              <button type="button" class="btn-ghost text-xs" (click)="cancelarEdicion()">Cancelar</button>
            }
          </div>

          <form [formGroup]="factorForm" (ngSubmit)="onGuardarFactor()" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            @if (!agregandoSubcriterioDe()) {
              <div>
                <label class="label-field">Fase *</label>
                <select formControlName="etapaEvaluacion" class="input-field">
                  <option value="CURRICULAR" [disabled]="!editandoFactor() && fasesUsadas().has('CURRICULAR')">Evaluación curricular</option>
                  <option value="TECNICA"    [disabled]="!editandoFactor() && fasesUsadas().has('TECNICA')">Evaluación técnica</option>
                  <option value="ENTREVISTA" [disabled]="!editandoFactor() && fasesUsadas().has('ENTREVISTA')">Entrevista Personal</option>
                </select>
                @if (!editandoFactor() && faseDuplicada()) {
                  <p class="text-xs text-red-500 mt-1">Esta fase ya fue registrada.</p>
                }
              </div>
            }
            <div [class.lg:col-span-2]="!agregandoSubcriterioDe()">
              <label class="label-field">Criterio *</label>
              <input formControlName="criterio" class="input-field" maxlength="180"
                [attr.readonly]="!editandoFactor() && !agregandoSubcriterioDe() ? true : null"
                [placeholder]="agregandoSubcriterioDe() ? 'Ej. Formación Académica, Experiencia' : null" />
              @if (factorForm.controls.criterio.touched && factorForm.controls.criterio.errors?.['required']) {
                <p class="text-xs text-red-500 mt-1">El criterio es obligatorio.</p>
              }
            </div>
            <div>
              <label class="label-field">Puntaje mínimo</label>
              <input formControlName="puntajeMinimo" type="text" inputmode="decimal" maxlength="6" class="input-field" placeholder="0–100"
                (input)="filtrarDecimal($event, factorForm.controls.puntajeMinimo, 100)" />
            </div>
            <div>
              <label class="label-field">Puntaje máximo *</label>
              <input formControlName="puntajeMaximo" type="text" inputmode="decimal" maxlength="6" class="input-field" placeholder="0–100"
                (input)="filtrarDecimal($event, factorForm.controls.puntajeMaximo, 100)" />
              @if (factorForm.controls.puntajeMaximo.touched && factorForm.controls.puntajeMaximo.errors?.['required']) {
                <p class="text-xs text-red-500 mt-1">El puntaje máximo es obligatorio.</p>
              } @else if (factorForm.controls.puntajeMaximo.touched && factorForm.controls.puntajeMaximo.errors?.['min']) {
                <p class="text-xs text-red-500 mt-1">Debe ser mayor a 0.</p>
              }
            </div>
            <div>
              <label class="label-field">Peso (%) *</label>
              <input formControlName="pesoCriterio" type="text" inputmode="decimal" maxlength="6" class="input-field" placeholder="0–100"
                (input)="filtrarDecimal($event, factorForm.controls.pesoCriterio, 100)" />
              @if (factorForm.controls.pesoCriterio.touched && factorForm.controls.pesoCriterio.errors?.['required']) {
                <p class="text-xs text-red-500 mt-1">El peso es obligatorio.</p>
              } @else if (factorForm.controls.pesoCriterio.touched && factorForm.controls.pesoCriterio.errors?.['min']) {
                <p class="text-xs text-red-500 mt-1">Debe ser mayor a 0.</p>
              } @else if (factorForm.controls.pesoCriterio.touched && factorForm.controls.pesoCriterio.errors?.['max']) {
                <p class="text-xs text-red-500 mt-1">No puede superar 100%.</p>
              } @else if (!editandoFactor() && !agregandoSubcriterioDe()) {
                <p class="text-xs text-gray-400 mt-1">Disponible: {{ pesoRestante() }}%</p>
              }
            </div>
            <div class="lg:col-span-2">
              <label class="label-field">Descripción</label>
              <textarea formControlName="descripcion" class="input-field" rows="2" maxlength="250" placeholder="Referencia normativa"></textarea>
            </div>
            <div class="flex items-end">
              <button type="submit" class="btn-primary text-sm"
                [disabled]="savingFactor() || factorForm.invalid || faseDuplicada() || (!editandoFactor() && !agregandoSubcriterioDe() && !puedeAgregarFase())">
                {{ savingFactor() ? 'Guardando...' : (editandoFactor() ? 'Actualizar' : 'Agregar') }}
              </button>
            </div>
          </form>
          @if (!puedeAgregarFase() && !editandoFactor() && !agregandoSubcriterioDe()) {
            <p class="text-sm text-amber-700">Máximo {{ MAX_FACTORES }} fases permitidas.</p>
          }
        </div>
        } <!-- fin @if (!modoLectura) -->

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- TABLA: fases y subcriterios registrados                 -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div class="card space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-gray-800">Fases de evaluación registradas</h3>
              <p class="text-sm text-gray-500">
                {{ factoresExistentes()?.length ?? 0 }} / {{ MAX_FACTORES }} fases. Peso total 100%.
              </p>
            </div>
          </div>

          @if (!factoresExistentes() || factoresExistentes()!.length === 0) {
            <p class="text-sm text-amber-600">No hay fases registradas aún.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm min-w-[560px]" role="grid" aria-label="Tabla de fases y subcriterios">
                <thead>
                  <tr class="bg-[#1F2133] text-white">
                    <th class="px-4 py-3 text-left font-semibold w-10">N°</th>
                    <th class="px-4 py-3 text-left font-semibold">Fases</th>
                    <th class="px-4 py-3 text-center font-semibold w-24">Peso (%)</th>
                    <th class="px-4 py-3 text-center font-semibold w-28">Puntaje Mínimo</th>
                    <th class="px-4 py-3 text-center font-semibold w-28">Puntaje Máximo</th>
                    <th class="px-4 py-3 text-center font-semibold w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <ng-container *ngFor="let item of filasParaTabla(); trackBy: trackByFila">
                    <tr class="border-t transition-colors"
                      [class.hover:bg-gray-50]="!item.esSubcriterio"
                      [class.bg-slate-50]="item.esSubcriterio"
                      [class.hover:bg-slate-100]="item.esSubcriterio">
                      <td class="px-4 py-2 text-gray-500 font-mono text-xs">
                        {{ item.esSubcriterio ? '' : item.numero }}
                      </td>
                      <td class="px-4 py-2 text-gray-800" [class.pl-10]="item.esSubcriterio">
                        @if (item.esSubcriterio) {
                          <span class="text-gray-500 text-xs">{{ item.fase.criterio }}</span>
                        } @else {
                          <span class="font-semibold">{{ etiquetaFase(item.fase.etapaEvaluacion) }}</span>
                        }
                      </td>
                      <td class="px-4 py-2 text-center font-mono text-xs">{{ item.fase.pesoCriterio }}%</td>
                      <td class="px-4 py-2 text-center font-mono text-xs">{{ item.fase.puntajeMinimo ?? '\u2014' }}</td>
                      <td class="px-4 py-2 text-center font-mono text-xs font-semibold">{{ item.fase.puntajeMaximo }}</td>
                      <td class="px-4 py-2">
                        <div class="flex justify-center gap-1">
                          @if (!modoLectura) {
                            <button type="button" class="btn-ghost text-xs text-blue-600" (click)="onEditarFactor(item.fase)" title="Editar">Editar</button>
                            @if (!item.esSubcriterio) {
                              <button type="button" class="btn-ghost text-xs text-green-600" (click)="onAgregarSubcriterio(item.fase)" title="Agregar subcriterio">+ Sub</button>
                            }
                            <button type="button" class="btn-ghost text-xs text-red-600" (click)="onConfirmarEliminar(item.fase)" title="Eliminar">Eliminar</button>
                          } @else {
                            <span class="text-xs text-gray-400">—</span>
                          }
                        </div>
                      </td>
                    </tr>
                  </ng-container>
                  <tr class="border-t-2 border-[#1F2133] bg-[#1F2133] text-white font-semibold">
                    <td class="px-4 py-3" colspan="2">Total</td>
                    <td class="px-4 py-3 text-center">{{ totalPeso() }}%</td>
                    <td class="px-4 py-3 text-center">{{ totalPuntajeMinimo() }}</td>
                    <td class="px-4 py-3 text-center">{{ totalPuntajeMaximo() }}</td>
                    <td class="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          }
        </div>

        @if (globalError()) {
          <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ globalError() }}</div>
        }

        <div class="flex items-end justify-end gap-3">
          <a [routerLink]="['/sistema/convocatoria', idConvocatoria, 'comite']"
             [queryParams]="modoLectura ? { modo: 'lectura' } : null"
             class="btn-ghost"></a>
          @if (!modoLectura) {
            <a [routerLink]="['/sistema/convocatoria', idConvocatoria, 'acta']" class="btn-primary">Continuar a Acta →</a>
          }
        </div>
      }

      <app-confirm-dialog
        [open]="showDeleteConfirm()"
        title="Eliminar factor"
        [message]="'¿Eliminar el criterio «' + (factorAEliminar()?.criterio ?? '') + '»?'"
        confirmText="Sí, eliminar"
        [confirmDanger]="true"
        (confirm)="onEliminarConfirmado()"
        (cancel)="showDeleteConfirm.set(false)" />
    </div>
  `,
})
export class FactoresComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly convocatoriaService = inject(ConvocatoriaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly MAX_FACTORES = MAX_FACTORES;
  readonly idConvocatoria = Number(this.route.snapshot.paramMap.get('id'));
  readonly modoLectura = this.route.snapshot.queryParamMap.get('modo') === 'lectura';
  readonly convocatoria = signal<ConvocatoriaResponse | null>(null);
  readonly loading = signal(true);
  readonly savingFactor = signal(false);
  readonly globalError = signal('');

  readonly factoresExistentes = signal<FactorDetalleResponse[] | null>(null);
  readonly editandoFactor = signal(false);
  readonly idFactorEditando = signal<number | null>(null);
  readonly agregandoSubcriterioDe = signal<FactorDetalleResponse | null>(null);
  readonly showDeleteConfirm = signal(false);
  readonly factorAEliminar = signal<FactorDetalleResponse | null>(null);

  readonly factorForm = this.fb.group({
    etapaEvaluacion: this.fb.nonNullable.control('CURRICULAR', Validators.required),
    criterio: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(180)]),
    puntajeMaximo: this.fb.nonNullable.control(100, [Validators.required, Validators.min(0.01), Validators.max(100)]),
    puntajeMinimo: this.fb.control<number | null>(0),
    pesoCriterio: this.fb.nonNullable.control(100, [Validators.required, Validators.min(0.01), Validators.max(100)]),
    orden: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    descripcion: this.fb.control<string | null>(null),
  });

  readonly puedeAgregarFase = computed(() => {
    const lista = this.factoresExistentes();
    return lista ? lista.length < MAX_FACTORES : true;
  });

  readonly fasesUsadas = computed(() => {
    const lista = this.factoresExistentes();
    return new Set((lista ?? []).map(f => f.etapaEvaluacion));
  });

  readonly etapaSeleccionada = signal<string>('CURRICULAR');

  readonly faseDuplicada = computed(() => {
    if (this.editandoFactor() || this.agregandoSubcriterioDe()) return false;
    return this.fasesUsadas().has(this.etapaSeleccionada());
  });

  readonly pesoRestante = computed(() => {
    return 100 - this.totalPeso();
  });

  constructor() {
    if (!Number.isFinite(this.idConvocatoria) || this.idConvocatoria <= 0) {
      this.loading.set(false);
      this.globalError.set('Identificador de convocatoria inválido.');
      return;
    }

    this.convocatoriaService.obtener(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<ConvocatoriaResponse>) => {
          this.convocatoria.set(res.data);
          this.cargarFactores();
        },
        error: () => {
          this.loading.set(false);
          this.globalError.set('No se pudo cargar la convocatoria.');
        },
      });

    this.factorForm.controls.etapaEvaluacion.valueChanges
      .pipe(
        startWith(this.factorForm.controls.etapaEvaluacion.value),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(etapa => {
        this.etapaSeleccionada.set(etapa ?? 'CURRICULAR');
        if (!this.editandoFactor() && !this.agregandoSubcriterioDe()) {
          const label = ETIQUETAS_FASE[etapa ?? ''] ?? etapa ?? '';
          this.factorForm.controls.criterio.setValue(label.toUpperCase(), { emitEvent: false });

          // Pre-llenar peso desde los valores de la convocatoria
          const conv = this.convocatoria();
          if (conv) {
            const pesoMap: Record<string, number | null | undefined> = {
              CURRICULAR: conv.pesoEvalCurricular,
              TECNICA:    conv.pesoEvalTecnica,
              ENTREVISTA: conv.pesoEntrevista,
            };
            const peso = pesoMap[etapa ?? ''];
            if (peso != null) {
              this.factorForm.controls.pesoCriterio.setValue(peso, { emitEvent: false });
            }
          }
        }
      });
  }

  private cargarFactores(): void {
    this.convocatoriaService.listarFactores(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<FactorDetalleResponse[]>) => {
          this.factoresExistentes.set(res.data ?? []);
          this.loading.set(false);
        },
        error: () => {
          this.factoresExistentes.set([]);
          this.loading.set(false);
        },
      });
  }

  onEditarFactor(f: FactorDetalleResponse): void {
    this.editandoFactor.set(true);
    this.idFactorEditando.set(f.idFactor);
    this.factorForm.patchValue({
      etapaEvaluacion: f.etapaEvaluacion,
      criterio: f.criterio,
      puntajeMaximo: f.puntajeMaximo,
      puntajeMinimo: f.puntajeMinimo ?? 0,
      pesoCriterio: f.pesoCriterio,
      orden: f.orden ?? 1,
      descripcion: f.descripcion ?? null,
    });
  }

  cancelarEdicion(): void {
    this.editandoFactor.set(false);
    this.idFactorEditando.set(null);
    this.agregandoSubcriterioDe.set(null);
    this.factorForm.reset({
      etapaEvaluacion: 'CURRICULAR',
      criterio: (ETIQUETAS_FASE['CURRICULAR'] ?? 'CURRICULAR').toUpperCase(),
      puntajeMaximo: 100,
      puntajeMinimo: 0,
      pesoCriterio: 100,
      orden: 1,
      descripcion: null,
    });
  }

  onAgregarSubcriterio(fase: FactorDetalleResponse): void {
    this.agregandoSubcriterioDe.set(fase);
    this.factorForm.patchValue({
      etapaEvaluacion: fase.etapaEvaluacion,
      criterio: '',
      puntajeMaximo: 10,
      puntajeMinimo: 10,
      pesoCriterio: 10,
      orden: (fase.subcriterios?.length ?? 0) + 1,
      descripcion: null,
    });
  }

  trackByFila(_index: number, item: { fase: FactorDetalleResponse }): number {
    return item.fase.idFactor;
  }

  filasParaTabla(): { idFactor: number; esSubcriterio: boolean; numero: number; fase: FactorDetalleResponse }[] {
    const lista = this.factoresExistentes();
    if (!lista || lista.length === 0) return [];
    const rows: { idFactor: number; esSubcriterio: boolean; numero: number; fase: FactorDetalleResponse }[] = [];
    let n = 0;
    for (const fa of lista) {
      n++;
      rows.push({ idFactor: fa.idFactor, esSubcriterio: false, numero: n, fase: fa });
      if (fa.subcriterios && fa.subcriterios.length > 0) {
        for (const sub of fa.subcriterios) {
          rows.push({ idFactor: sub.idFactor, esSubcriterio: true, numero: n, fase: sub });
        }
      }
    }
    return rows;
  }

  etiquetaFase(etapa: string): string {
    return ETIQUETAS_FASE[etapa] ?? etapa;
  }

  totalPeso(): number {
    const lista = this.factoresExistentes();
    if (!lista) return 0;
    return lista.reduce((acc, f) => acc + Number(f.pesoCriterio ?? 0), 0);
  }

  totalPuntajeMinimo(): number {
    const lista = this.factoresExistentes();
    if (!lista) return 0;
    return lista.reduce((acc, f) => acc + Number(f.puntajeMinimo ?? 0), 0);
  }

  totalPuntajeMaximo(): number {
    const lista = this.factoresExistentes();
    if (!lista) return 0;
    return lista.reduce((acc, f) => acc + Number(f.puntajeMaximo ?? 0), 0);
  }

  onGuardarFactor(): void {
    this.globalError.set('');
    if (this.factorForm.invalid) {
      this.factorForm.markAllAsTouched();
      this.toast.warning('Complete todos los campos requeridos.');
      return;
    }

    const pMin = Number(this.factorForm.controls.puntajeMinimo.value ?? 0);
    const pMax = Number(this.factorForm.controls.puntajeMaximo.value);
    if (pMin > pMax) {
      this.toast.warning('El puntaje mínimo no puede superar al máximo.');
      return;
    }

    const padre = this.agregandoSubcriterioDe();

    if (!this.editandoFactor() && !padre) {
      if (this.faseDuplicada()) {
        this.toast.warning('La fase «' + (ETIQUETAS_FASE[this.factorForm.controls.etapaEvaluacion.value] ?? '') + '» ya fue registrada.');
        return;
      }
      const pesoNuevo = Number(this.factorForm.controls.pesoCriterio.value);
      if (this.totalPeso() + pesoNuevo > 100) {
        this.toast.warning('El peso ingresado supera el 100% total. Disponible: ' + this.pesoRestante() + '%.');
        return;
      }
    }
    const req: FactorFactorRequest = {
      etapaEvaluacion: this.factorForm.controls.etapaEvaluacion.value,
      criterio: this.factorForm.controls.criterio.value!.trim(),
      idFactorPadre: padre ? padre.idFactor : null,
      puntajeMaximo: Number(this.factorForm.controls.puntajeMaximo.value),
      puntajeMinimo: this.factorForm.controls.puntajeMinimo.value != null ? Number(this.factorForm.controls.puntajeMinimo.value) : null,
      pesoCriterio: Number(this.factorForm.controls.pesoCriterio.value),
      orden: Number(this.factorForm.controls.orden.value) || 1,
      descripcion: this.factorForm.controls.descripcion.value?.trim() || null,
    };

    this.savingFactor.set(true);

    if (this.editandoFactor() && this.idFactorEditando()) {
      this.convocatoriaService.actualizarFactor(this.idConvocatoria, this.idFactorEditando()!, req)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.savingFactor.set(false);
            this.toast.success('Factor actualizado.');
            this.cancelarEdicion();
            this.cargarFactores();
          },
          error: (err: { error?: { message?: string } }) => {
            this.savingFactor.set(false);
            this.toast.error(err.error?.message ?? 'No se pudo actualizar.');
          },
        });
    } else {
      if (!padre && !this.puedeAgregarFase()) {
        this.toast.warning('Máximo ' + MAX_FACTORES + ' fases permitidas.');
        this.savingFactor.set(false);
        return;
      }
      this.convocatoriaService.agregarFactor(this.idConvocatoria, req)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.savingFactor.set(false);
            this.toast.success(padre ? 'Subcriterio agregado.' : 'Fase agregada.');
            this.agregandoSubcriterioDe.set(null);
            this.factorForm.reset({
              etapaEvaluacion: 'CURRICULAR',
              criterio: (ETIQUETAS_FASE['CURRICULAR'] ?? 'CURRICULAR').toUpperCase(),
              puntajeMaximo: 100,
              puntajeMinimo: 0,
              pesoCriterio: 100,
              orden: 1,
              descripcion: null,
            });
            this.cargarFactores();
          },
          error: (err: { error?: { message?: string } }) => {
            this.savingFactor.set(false);
            this.toast.error(err.error?.message ?? 'No se pudo agregar factor.');
          },
        });
    }
  }

  filtrarDecimal(event: Event, ctrl: FormControl, max: number): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1').slice(0, 6);
    const num = limpio === '' || limpio === '.' ? null : Math.min(parseFloat(limpio), max);
    input.value = limpio;
    ctrl.setValue(num !== null ? num : null, { emitEvent: true });
    ctrl.updateValueAndValidity();
  }

  onConfirmarEliminar(f: FactorDetalleResponse): void {
    this.factorAEliminar.set(f);
    this.showDeleteConfirm.set(true);
  }

  onEliminarConfirmado(): void {
    this.showDeleteConfirm.set(false);
    const f = this.factorAEliminar();
    if (!f) return;

    this.convocatoriaService.eliminarFactor(this.idConvocatoria, f.idFactor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Factor eliminado.');
          this.factorAEliminar.set(null);
          this.cargarFactores();
        },
        error: (err: { error?: { message?: string } }) => {
          this.toast.error(err.error?.message ?? 'No se pudo eliminar.');
        },
      });
  }

}
