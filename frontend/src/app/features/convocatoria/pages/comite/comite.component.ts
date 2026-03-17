import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '@core/auth/auth.service';
import { ConvocatoriaService } from '../../services/convocatoria.service';
import {
  ComiteDetalleResponse,
  ComiteRequest,
  ComiteResponse,
  ConvocatoriaResponse,
  MiembroComiteItem,
  MiembroComiteRequest,
  MiembroDetalleItem,
} from '../../models/convocatoria.model';
import { ApiResponse } from '@shared/models/api-response.model';

@Component({
  selector: 'app-comite',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Comité de Selección"
        [estado]="convocatoria()?.estado"
        subtitle="E11 — Registrar comité con al menos 3 miembros: presidente, secretario y vocal.">
        <a routerLink="/sistema/convocatoria" class="btn-ghost">← Volver</a>
      </app-page-header>

      @if (loading()) {
        <div class="card text-center py-12 text-gray-400">Cargando...</div>
      } @else {

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- VISTA COMITÉ EXISTENTE: tabla + CRUD individual         -->
        <!-- ═══════════════════════════════════════════════════════ -->
        @if (comiteExistente()) {
          <div class="card space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-gray-800">Comité registrado</h3>
                <p class="text-sm text-gray-500">
                  Resolución: <span class="font-medium text-gray-700">{{ comiteExistente()?.numeroResolucion }}</span>
                  · Fecha: <span class="font-medium text-gray-700">{{ comiteExistente()?.fechaDesignacion ?? '—' }}</span>
                </p>
              </div>
              <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                [class.bg-green-100]="comiteExistente()?.estado === 'COMITE_CONFORMADO'"
                [class.text-green-800]="comiteExistente()?.estado === 'COMITE_CONFORMADO'"
                [class.bg-amber-100]="comiteExistente()?.estado !== 'COMITE_CONFORMADO'"
                [class.text-amber-800]="comiteExistente()?.estado !== 'COMITE_CONFORMADO'">
                {{ comiteExistente()?.estado ?? 'ACTIVO' }}
              </span>
            </div>

            <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <strong>Convocatoria:</strong> {{ convocatoria()?.numeroConvocatoria }}
              · <strong>ID:</strong> {{ idConvocatoria }}
              · <strong>ID Comité:</strong> {{ comiteExistente()?.idComite }}
            </div>

            <!-- Tabla de miembros -->
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-[#1F2133] text-white">
                    <th class="px-4 py-3 text-left font-semibold">#</th>
                    <th class="px-4 py-3 text-left font-semibold">Nombres completos</th>
                    <th class="px-4 py-3 text-left font-semibold">Cargo</th>
                    <th class="px-4 py-3 text-center font-semibold">Rol</th>
                    <th class="px-4 py-3 text-center font-semibold">Titular</th>
                    <th class="px-4 py-3 text-center font-semibold">N° Convocatoria</th>
                    <th class="px-4 py-3 text-center font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of comiteExistente()?.miembros ?? []; track m.idMiembroComite; let i = $index) {
                    <tr class="border-t hover:bg-gray-50 transition-colors">
                      <td class="px-4 py-3 text-gray-500 font-mono">{{ i + 1 }}</td>
                      <td class="px-4 py-3 font-medium text-gray-800">{{ m.nombresCompletos }}</td>
                      <td class="px-4 py-3 text-gray-700">{{ m.cargo || '—' }}</td>
                      <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          [class.bg-blue-100]="m.rolComite === 'PRESIDENTE'"
                          [class.text-blue-800]="m.rolComite === 'PRESIDENTE'"
                          [class.bg-purple-100]="m.rolComite === 'SECRETARIO'"
                          [class.text-purple-800]="m.rolComite === 'SECRETARIO'"
                          [class.bg-amber-100]="m.rolComite === 'VOCAL' || m.rolComite === 'SUPLENTE'"
                          [class.text-amber-800]="m.rolComite === 'VOCAL' || m.rolComite === 'SUPLENTE'">
                          {{ m.rolComite }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        @if (m.esTitular) {
                          <span class="text-green-600 font-semibold">Sí</span>
                        } @else {
                          <span class="text-gray-400">No</span>
                        }
                      </td>
                      <td class="px-4 py-3 text-center font-mono text-xs text-gray-600">
                        {{ convocatoria()?.numeroConvocatoria ?? '—' }}
                      </td>
                      <td class="px-4 py-3 text-center">
                        <div class="flex justify-center gap-1">
                          <button class="btn-ghost text-xs text-blue-600" (click)="onEditarMiembro(m)" title="Editar">
                            Editar
                          </button>
                          <button class="btn-ghost text-xs text-red-600" (click)="onConfirmarEliminar(m)" title="Eliminar">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="text-xs text-gray-500">
              Total: {{ comiteExistente()?.miembros?.length ?? 0 }} miembro(s)
            </div>
          </div>

          <!-- Formulario agregar / editar miembro individual -->
          <div class="card space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-800">
                {{ editandoMiembro() ? 'Editar miembro' : '+ Agregar miembro' }}
              </h3>
              @if (editandoMiembro()) {
                <button class="btn-ghost text-xs" (click)="cancelarEdicion()">Cancelar edición</button>
              }
            </div>

            <form [formGroup]="miembroForm" (ngSubmit)="onGuardarMiembro()" class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="label-field">Nombres completos *</label>
                <input formControlName="nombresCompletos" class="input-field" maxlength="150"
                  placeholder="Nombres y apellidos" />
              </div>
              <div>
                <label class="label-field">Cargo</label>
                <input formControlName="cargo" class="input-field" maxlength="120"
                  placeholder="Ej. Director de RRHH" />
              </div>
              <div>
                <label class="label-field">Rol en comité *</label>
                <select formControlName="rolComite" class="input-field">
                  <option value="PRESIDENTE">Presidente</option>
                  <option value="SECRETARIO">Secretario</option>
                  <option value="VOCAL">Vocal</option>
                  <option value="SUPLENTE">Suplente</option>
                  <option value="OTRO">Otro...</option>
                </select>
                @if (miembroForm.get('rolComite')?.value === 'OTRO') {
                    <input formControlName="rolComiteCustom" class="input-field mt-2" 
                      maxlength="20" placeholder="Escriba el rol" />
                  }
              </div>
              <div class="flex items-end gap-3">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 mb-2">
                  <input type="checkbox" formControlName="esTitular" />
                  Titular
                </label>
                <button type="submit" class="btn-primary text-sm" [disabled]="savingMiembro()">
                  {{ savingMiembro() ? 'Guardando...' : (editandoMiembro() ? 'Actualizar' : 'Agregar') }}
                </button>
              </div>
            </form>
          </div>

          @if (globalError()) {
            <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {{ globalError() }}
            </div>
          }

          @if (comiteConformado()) {
            <div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
              Comité conformado. Puede continuar a Factores.
             
            </div>
          }

          <div class="flex items-center justify-end gap-3">
            <a [routerLink]="['/sistema/convocatoria', idConvocatoria, 'cronograma']" class="btn-ghost"
              aria-label="Volver a cronograma">
              ← Volver a cronograma
            </a>
            @if (muestraBotonNotificar()) {
              <button type="button" class="btn-primary"
                [disabled]="savingNotificar() || !comiteEstructuraConformada()"
                [attr.aria-disabled]="savingNotificar() || !comiteEstructuraConformada()"
                [attr.aria-label]="comiteEstructuraConformada() ? 'Notificar al comité de selección' : 'Complete el comité (mín. 3 miembros: Presidente, Secretario, Vocal)'"
                [title]="comiteEstructuraConformada() ? 'Notificar al comité' : 'Requiere mínimo 3 miembros con roles Presidente, Secretario y Vocal'"
                (click)="onNotificarComite()">
                {{ savingNotificar() ? 'Notificando...' : 'Notificar a Comité' }}
              </button>
            }
          </div>
        }

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- FORMULARIO REGISTRO INICIAL (batch E11)                -->
        <!-- ═══════════════════════════════════════════════════════ -->
        @if (!comiteExistente()) {
          <form [formGroup]="form" (ngSubmit)="onSubmitBatch()" class="space-y-6">
            <div class="card grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="label-field">N° Resolución *</label>
                <input formControlName="numeroResolucion" class="input-field" maxlength="80"
                  placeholder="Ej. R-001-2026-ACFFAA" />
              </div>
              <div>
                <label class="label-field">Fecha designación *</label>
                <input formControlName="fechaDesignacion" type="date" class="input-field" />
              </div>
            </div>

            <div class="card space-y-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="font-semibold text-gray-800">Miembros del comité</h3>
                  <p class="text-sm text-gray-500">Mínimo 3 integrantes. Se exige Presidente, Secretario y Vocal.</p>
                </div>
                <button type="button" class="btn-primary" (click)="addMiembroBatch()">+ Agregar miembro</button>
              </div>

              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                @for (group of miembroBatchControls(); track $index) {
                  <div [formGroup]="group" class="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-4">
                    <div class="flex items-center justify-between gap-3">
                      <h4 class="font-medium text-gray-800">Miembro {{ $index + 1 }}</h4>
                      @if (miembroBatchControls().length > 3) {
                        <button type="button" class="btn-ghost text-red-600" (click)="removeMiembroBatch($index)">
                          Eliminar
                        </button>
                      }
                    </div>
                    <div>
                      <label class="label-field">Nombres completos *</label>
                      <input formControlName="nombresCompletos" class="input-field" maxlength="150"
                        placeholder="Nombres y apellidos" />
                    </div>
                    <div>
                      <label class="label-field">Cargo</label>
                      <input formControlName="cargo" class="input-field" maxlength="120"
                        placeholder="Ej. Director de RRHH" />
                    </div>
                    <div>
                      <label class="label-field">Rol en comité *</label>
                      <select formControlName="rolComite" class="input-field">
                        <option value="PRESIDENTE">Presidente</option>
                        <option value="SECRETARIO">Secretario</option>
                        <option value="VOCAL">Vocal</option>
                        <option value="SUPLENTE">Suplente</option>
                        <option value="OTRO">Otro...</option>
                      </select>
                      @if (group.get('rolComite')?.value === 'OTRO') {
                        <input formControlName="rolComiteCustom" class="input-field mt-2" 
                          maxlength="20" placeholder="Escriba el rol" />
                      }
                    </div>
                    <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" formControlName="esTitular" />
                      Miembro titular
                    </label>
                  </div>
                }
              </div>
            </div>

            <div class="card grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div class="text-sm text-gray-500">Total miembros</div>
                <div class="font-semibold text-gray-800">{{ totalMiembrosBatch() }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Roles base completos</div>
                <div class="font-semibold"
                  [class.text-green-700]="rolesBaseCompletos()"
                  [class.text-red-600]="!rolesBaseCompletos()">
                  {{ rolesBaseCompletos() ? 'Sí' : 'No' }}
                </div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Titulares</div>
                <div class="font-semibold text-gray-800">{{ titularesCount() }}</div>
              </div>
            </div>

            @if (globalError()) {
              <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {{ globalError() }}
              </div>
            }

            <div class="flex items-center justify-end gap-3">
              <a [routerLink]="['/sistema/convocatoria', idConvocatoria, 'cronograma']" class="btn-ghost">
                ← Volver a cronograma
              </a>
              <button type="submit" class="btn-primary" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : 'Guardar y continuar a Factores' }}
              </button>
            </div>
          </form>
        }
      }

      <!-- Confirm dialog para eliminar -->
      <app-confirm-dialog
        [open]="showDeleteConfirm()"
        title="Eliminar miembro"
        [message]="'¿Eliminar a ' + (miembroAEliminar()?.nombresCompletos ?? '') + ' del comité?'"
        confirmText="Sí, eliminar"
        [confirmDanger]="true"
        (confirm)="onEliminarConfirmado()"
        (cancel)="showDeleteConfirm.set(false)" />
    </div>
  `,
})
export class ComiteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly convocatoriaService = inject(ConvocatoriaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idConvocatoria = Number(this.route.snapshot.paramMap.get('id'));
  readonly convocatoria = signal<ConvocatoriaResponse | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingMiembro = signal(false);
  readonly savingNotificar = signal(false);
  readonly globalError = signal('');

  /** Comité existente cargado desde GET /comite */
  readonly comiteExistente = signal<ComiteDetalleResponse | null>(null);

  readonly isOrh = () => this.auth.hasAnyRole(['ROLE_ORH', 'ROLE_ADMIN']);
  readonly comiteConformado = () => this.comiteExistente()?.estado === 'COMITE_CONFORMADO';
  readonly muestraBotonNotificar = () =>
    this.isOrh() && this.comiteExistente() && !this.comiteConformado();

  /** Comité con estructura válida: mín. 3 miembros y roles Presidente, Secretario, Vocal. */
  readonly comiteEstructuraConformada = computed(() => {
    const miembros = this.comiteExistente()?.miembros ?? [];
    if (miembros.length < 3) return false;
    const roles = miembros.map((m) => m.rolComite);
    return ['PRESIDENTE', 'SECRETARIO', 'VOCAL'].every((r) => roles.includes(r));
  });

  /** CRUD individual: miembro en edición */
  readonly editandoMiembro = signal(false);
  readonly idMiembroEditando = signal<number | null>(null);

  /** Eliminar: confirm dialog */
  readonly showDeleteConfirm = signal(false);
  readonly miembroAEliminar = signal<MiembroDetalleItem | null>(null);

  // ═══ Formulario CRUD individual ═══
  readonly miembroForm = this.fb.group({
    nombresCompletos: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
    cargo: this.fb.control<string | null>(null),
    rolComite: this.fb.nonNullable.control('VOCAL', Validators.required),
    esTitular: this.fb.nonNullable.control(true),
    rolComiteCustom: this.fb.control<string | null>(null),
  });

  // ═══ Formulario batch E11 (registro inicial) ═══
  readonly form = this.fb.group({
    numeroResolucion: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(80)]),
    fechaDesignacion: this.fb.nonNullable.control('', Validators.required),
    miembros: this.fb.array([
      this.createMiembroBatchGroup('PRESIDENTE'),
      this.createMiembroBatchGroup('SECRETARIO'),
      this.createMiembroBatchGroup('VOCAL'),
    ]),
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
          this.cargarComiteExistente();
        },
        error: () => {
          this.loading.set(false);
          this.globalError.set('No se pudo cargar la convocatoria.');
        },
      });
  }

  // ═══════════════════════════════════════════════
  // BATCH (E11) — Registro inicial del comité
  // ═══════════════════════════════════════════════

  get miembrosArray(): FormArray {
    return this.form.controls.miembros as FormArray;
  }

  miembroBatchControls(): FormGroup[] {
    return this.miembrosArray.controls as FormGroup[];
  }

  readonly totalMiembrosBatch = computed(() => this.miembroBatchControls().length);

  readonly titularesCount = computed(() =>
    this.miembroBatchControls().filter(g => Boolean(g.get('esTitular')?.value)).length,
  );

  readonly rolesBaseCompletos = computed(() => {
    const roles = this.miembroBatchControls().map(g => String(g.get('rolComite')?.value || ''));
    return ['PRESIDENTE', 'SECRETARIO', 'VOCAL'].every(r => roles.includes(r));
  });

  addMiembroBatch(): void {
    this.miembrosArray.push(this.createMiembroBatchGroup('SUPLENTE'));
  }

  removeMiembroBatch(index: number): void {
    this.miembrosArray.removeAt(index);
  }

  onSubmitBatch(): void {
    this.globalError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Complete la resolución, fecha y todos los miembros.');
      return;
    }
    if (this.totalMiembrosBatch() < 3) {
      this.globalError.set('El comité debe tener al menos 3 miembros.');
      return;
    }
    if (!this.rolesBaseCompletos()) {
      this.globalError.set('Debe registrar Presidente, Secretario y Vocal.');
      return;
    }

    const miembros: MiembroComiteItem[] = this.miembroBatchControls().map(g => ({
      idUsuario: null,
      nombresCompletos: (g.get('nombresCompletos')?.value as string).trim(),
      cargo: (g.get('cargo')?.value as string | null)?.trim() || null,
      //rolComite: g.get('rolComite')?.value as string,
      rolComite: (g.get('rolComite')?.value as string) === 'OTRO'
      ? (g.get('rolComiteCustom')?.value as string ?? '').trim().toUpperCase()
      : g.get('rolComite')?.value as string,

      esTitular: Boolean(g.get('esTitular')?.value),
    }));

    const payload: ComiteRequest = {
      numeroResolucion: this.form.controls.numeroResolucion.value.trim(),
      fechaDesignacion: this.form.controls.fechaDesignacion.value,
      miembros,
    };

    this.saving.set(true);
    this.convocatoriaService.registrarComite(this.idConvocatoria, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (_res: ApiResponse<ComiteResponse>) => {
          this.saving.set(false);
          this.toast.success('Comité registrado correctamente.');
          this.cargarComiteExistente();
        },
        error: (err: { error?: { message?: string } }) => {
          this.saving.set(false);
          this.globalError.set(err.error?.message || 'No se pudo registrar el comité.');
          this.toast.error(this.globalError());
        },
      });
  }

  // ═══════════════════════════════════════════════
  // CRUD INDIVIDUAL — Agregar / Editar / Eliminar
  // ═══════════════════════════════════════════════

  onEditarMiembro(m: MiembroDetalleItem): void {
    this.editandoMiembro.set(true);
    this.idMiembroEditando.set(m.idMiembroComite);
    this.miembroForm.patchValue({
      nombresCompletos: m.nombresCompletos,
      cargo: m.cargo ?? null,
      rolComite: m.rolComite,
      esTitular: m.esTitular,
    });
  }

  onNotificarComite(): void {
    this.globalError.set('');
    this.savingNotificar.set(true);
    this.convocatoriaService.notificarComite(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<void>) => {
          this.savingNotificar.set(false);
          this.toast.success(res.message ?? 'Comité notificado correctamente.');
          this.cargarComiteExistente();
        },
        error: (err: { error?: { message?: string } }) => {
          this.savingNotificar.set(false);
          this.globalError.set(err.error?.message ?? 'No se pudo notificar al comité.');
          this.toast.error(this.globalError());
        },
      });
  }

  cancelarEdicion(): void {
    this.editandoMiembro.set(false);
    this.idMiembroEditando.set(null);
    this.miembroForm.reset({ nombresCompletos: '', cargo: null, rolComite: 'VOCAL', esTitular: true });
  }

  onGuardarMiembro(): void {
    this.globalError.set('');
    if (this.miembroForm.invalid) {
      this.miembroForm.markAllAsTouched();
      this.toast.warning('Complete nombres y rol del miembro.');
      return;
    }

    const req: MiembroComiteRequest = {
      nombresCompletos: this.miembroForm.controls.nombresCompletos.value.trim(),
      cargo: this.miembroForm.controls.cargo.value?.trim() || null,
      //rolComite: this.miembroForm.controls.rolComite.value,
      rolComite: this.miembroForm.controls.rolComite.value === 'OTRO'
      ? (this.miembroForm.get('rolComiteCustom')?.value as string ?? '').trim().toUpperCase()
      : this.miembroForm.controls.rolComite.value,

      esTitular: this.miembroForm.controls.esTitular.value,
    };

    this.savingMiembro.set(true);

    if (this.editandoMiembro() && this.idMiembroEditando()) {
      // PUT — Actualizar
      this.convocatoriaService.actualizarMiembro(this.idConvocatoria, this.idMiembroEditando()!, req)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.savingMiembro.set(false);
            this.toast.success('Miembro actualizado.');
            this.cancelarEdicion();
            this.cargarComiteExistente();
          },
          error: (err: { error?: { message?: string } }) => {
            this.savingMiembro.set(false);
            this.toast.error(err.error?.message || 'No se pudo actualizar.');
          },
        });
    } else {
      // POST — Agregar
      this.convocatoriaService.agregarMiembro(this.idConvocatoria, req)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.savingMiembro.set(false);
            this.toast.success('Miembro agregado.');
            this.miembroForm.reset({ nombresCompletos: '', cargo: null, rolComite: 'VOCAL', esTitular: true });
            this.cargarComiteExistente();
          },
          error: (err: { error?: { message?: string } }) => {
            this.savingMiembro.set(false);
            this.toast.error(err.error?.message || 'No se pudo agregar miembro.');
          },
        });
    }
  }

  onConfirmarEliminar(m: MiembroDetalleItem): void {
    this.miembroAEliminar.set(m);
    this.showDeleteConfirm.set(true);
  }

  onEliminarConfirmado(): void {
    this.showDeleteConfirm.set(false);
    const m = this.miembroAEliminar();
    if (!m) return;

    this.convocatoriaService.eliminarMiembro(this.idConvocatoria, m.idMiembroComite)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Miembro eliminado.');
          this.miembroAEliminar.set(null);
          this.cargarComiteExistente();
        },
        error: (err: { error?: { message?: string } }) => {
          this.toast.error(err.error?.message || 'No se pudo eliminar.');
        },
      });
  }

  // ═══════════════════════════════════════════════
  // CARGA DE DATOS
  // ═══════════════════════════════════════════════

  private cargarComiteExistente(): void {
    this.convocatoriaService.obtenerComite(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<ComiteDetalleResponse>) => {
          this.comiteExistente.set(res.data);
          this.loading.set(false);
        },
        error: () => {
          this.comiteExistente.set(null);
          this.loading.set(false);
        },
      });
  }

  private createMiembroBatchGroup(rol: string): FormGroup {
    return this.fb.group({
      nombresCompletos: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
      cargo: this.fb.control<string | null>(null),
      rolComite: this.fb.nonNullable.control(rol, Validators.required),
      esTitular: this.fb.nonNullable.control(true),
      rolComiteCustom: this.fb.control<string | null>(null),
    });
  }
}