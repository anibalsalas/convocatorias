import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Observable, Subject, startWith, take } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

/** Validador de dominio @acffaa.gob.pe */
const ACFFAA_EMAIL_PATTERN = /^[a-zA-Z0-9._%+\-]+@acffaa\.gob\.pe$/;

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

      @if (modoLectura) {
        <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Solo lectura — la convocatoria ya fue publicada. No se pueden realizar cambios.
        </div>
      }

      @if (loading()) {
        <div class="card text-center py-12 text-gray-400">Cargando...</div>
      } @else {

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- COMITÉ EXISTENTE                                        -->
        <!-- ═══════════════════════════════════════════════════════ -->
        @if (comiteExistente()) {

          <!-- Cabecera del comité -->
          <div class="card">
            <div class="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 class="font-semibold text-gray-800">Comité registrado</h3>
                <p class="text-sm text-gray-500 mt-0.5">
                  Resolución: <span class="font-medium text-gray-700">{{ comiteExistente()!.numeroResolucion }}</span>
                  &nbsp;·&nbsp; Fecha: <span class="font-medium text-gray-700">{{ comiteExistente()!.fechaDesignacion ?? '—' }}</span>
                </p>
              </div>
              <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                [class.bg-green-100]="comiteExistente()!.estado === 'COMITE_CONFORMADO'"
                [class.text-green-800]="comiteExistente()!.estado === 'COMITE_CONFORMADO'"
                [class.bg-amber-100]="comiteExistente()!.estado !== 'COMITE_CONFORMADO'"
                [class.text-amber-800]="comiteExistente()!.estado !== 'COMITE_CONFORMADO'">
                {{ comiteExistente()!.estado }}
              </span>
            </div>
          </div>

          <!-- Tarjeta de captura única (agregar / editar miembro) — solo en modo edición -->
          @if (!modoLectura) {
          <div class="card space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                {{ editandoMiembro() ? '✏️ Editar miembro' : '+ Agregar miembro' }}
              </h3>
              @if (editandoMiembro()) {
                <button class="btn-ghost text-xs" (click)="cancelarEdicion()">Cancelar</button>
              }
            </div>

            <form [formGroup]="captureForm" (ngSubmit)="onGuardarMiembro()"
                  class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div>
                <label class="label-field">Nombres completos <span class="text-red-500">*</span></label>
                <input formControlName="nombresCompletos" class="input-field" maxlength="200"
                  placeholder="Nombres y apellidos completos" />
                @if (captureForm.controls['nombresCompletos'].touched && captureForm.controls['nombresCompletos'].invalid) {
                  <span class="text-xs text-red-500">Obligatorio</span>
                }
              </div>

              <div>
                <label class="label-field">Cargo</label>
                <input formControlName="cargo" class="input-field" maxlength="200"
                  placeholder="Ej. Director de RRHH" />
              </div>

              <div>
                <label class="label-field">Rol en comité <span class="text-red-500">*</span></label>
                <select formControlName="rolComite" class="input-field">
                  <option value="PRESIDENTE">Presidente</option>
                  <option value="SECRETARIO">Secretario</option>
                  <option value="VOCAL">Vocal</option>
                  <option value="SUPLENTE">Suplente</option>
                </select>
              </div>

              <div>
                <label class="label-field">Correo institucional <span class="text-red-500">*</span></label>
                <input formControlName="email" class="input-field" maxlength="100"
                  placeholder="usuario@acffaa.gob.pe" type="email" />
                @if (captureForm.controls['email'].touched && captureForm.controls['email'].errors) {
                  @if (captureForm.controls['email'].errors['required']) {
                    <span class="text-xs text-red-500">El correo institucional es obligatorio.</span>
                  } @else if (captureForm.controls['email'].errors['pattern']) {
                    <span class="text-xs text-red-500">Debe ser un correo &#64;acffaa.gob.pe válido.</span>
                  } @else if (captureForm.controls['email'].errors['maxlength']) {
                    <span class="text-xs text-red-500">Máximo 100 caracteres.</span>
                  }
                }
              </div>

              <div class="flex items-end gap-4">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 mb-2">
                  <input type="checkbox" formControlName="esTitular" />
                  Titular
                </label>
                <button type="submit" class="btn-primary text-sm mb-2"
                        [disabled]="savingMiembro() || captureForm.invalid">
                  {{ savingMiembro() ? 'Guardando...' : (editandoMiembro() ? 'Actualizar' : 'Agregar') }}
                </button>
              </div>
            </form>
          </div>
          } <!-- fin @if (!modoLectura) -->

          <!-- Tabla dinámica de miembros existentes -->
          <div class="card space-y-4">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-[#1F2133] text-white">
                    <th class="px-3 py-2 text-left font-semibold text-xs">#</th>
                    <th class="px-3 py-2 text-left font-semibold text-xs">Nombres</th>
                    <th class="px-3 py-2 text-left font-semibold text-xs">Cargo</th>
                    <th class="px-3 py-2 text-center font-semibold text-xs">Rol</th>
                    <th class="px-3 py-2 text-center font-semibold text-xs">Titular</th>
                    <th class="px-3 py-2 text-left font-semibold text-xs">Correo</th>
                    <th class="px-3 py-2 text-center font-semibold text-xs">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of comiteExistente()!.miembros; track m.idMiembroComite; let i = $index) {
                    <tr class="border-t hover:bg-gray-50 transition-colors">
                      <td class="px-3 py-2 text-gray-400 text-xs font-mono">{{ i + 1 }}</td>
                      <td class="px-3 py-2 font-medium text-gray-800">{{ m.nombresCompletos }}</td>
                      <td class="px-3 py-2 text-gray-600 text-xs">{{ m.cargo || '—' }}</td>
                      <td class="px-3 py-2 text-center">
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
                      <td class="px-3 py-2 text-center text-base">{{ m.esTitular ? '✓' : '—' }}</td>
                      <td class="px-3 py-2 text-xs text-gray-600 font-mono">{{ m.email || '—' }}</td>
                      <td class="px-3 py-2 text-center">
                        <div class="flex justify-center gap-1">
                          @if (!modoLectura) {
                            <button class="btn-ghost text-xs text-blue-600" (click)="onEditarMiembro(m)" title="Editar">
                              Editar
                            </button>
                            <button class="btn-ghost text-xs text-red-600" (click)="onConfirmarEliminar(m)" title="Eliminar">
                              Eliminar
                            </button>
                            <button class="btn-ghost text-xs transition-colors"
                              [disabled]="notificandoId() === m.idMiembroComite || !m.email"
                              [class.text-green-500]="m.fechaUltNotificacion"
                              [class.text-gray-400]="!m.fechaUltNotificacion"
                              [title]="buildTooltipNotificar(m)"
                              (click)="onNotificarMiembro(m)">
                              {{ notificandoId() === m.idMiembroComite ? '⟳' : '✉' }}
                            </button>
                          } @else {
                            <span class="text-xs text-gray-400">—</span>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="px-3 py-6 text-center text-gray-400 text-sm">
                        Aún no hay miembros. Use el formulario superior para agregar.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Resumen dinámico -->
            <div class="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
              <div class="text-center">
                <div class="text-xs text-gray-500 uppercase tracking-wide">Total miembros</div>
                <div class="font-bold text-lg text-gray-800">{{ totalMiembrosExistente() }}</div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500 uppercase tracking-wide">Roles base</div>
                <div class="font-bold text-lg"
                  [class.text-green-600]="rolesBaseCompletosExistente()"
                  [class.text-red-500]="!rolesBaseCompletosExistente()">
                  {{ rolesBaseCompletosExistente() ? 'Completos' : 'Incompletos' }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500 uppercase tracking-wide">Titulares</div>
                <div class="font-bold text-lg text-gray-800">{{ titularesExistente() }}</div>
              </div>
            </div>
          </div>

          @if (globalError()) {
            <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {{ globalError() }}
            </div>
          }

          <div class="flex items-center justify-between gap-3 flex-wrap">
            <a [routerLink]="['/sistema/convocatoria', idConvocatoria, 'cronograma']"
               [queryParams]="modoLectura ? { modo: 'lectura' } : null"
               class="btn-ghost">
              ← Volver a cronograma
            </a>
            @if (!modoLectura) {
              <div class="flex gap-3">
                @if (muestraBotonNotificar()) {
                  <button type="button" class="btn-primary"
                    [disabled]="savingNotificar() || !comiteEstructuraConformada()"
                    [title]="comiteEstructuraConformada() ? 'Notificar al comité' : 'Requiere Pdte., Sec. y Vocal'"
                    (click)="onNotificarComite()">
                    {{ savingNotificar() ? 'Notificando...' : 'Notificar a Comité' }}
                  </button>
                }
              
              </div>
            }
          </div>
        }

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- REGISTRO INICIAL — Tarjeta única + tabla local         -->
        <!-- ═══════════════════════════════════════════════════════ -->
        @if (!comiteExistente()) {
          <div class="space-y-6">

            <!-- Datos de la resolución -->
            <div class="card grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="label-field">N° Resolución <span class="text-red-500">*</span></label>
                <input [formControl]="ctrlResolucion" class="input-field" maxlength="80"
                  placeholder="Ej. R-001-2026-ACFFAA"
                  (input)="sanitizarResolucion($event)" />
                @if (ctrlResolucion.touched && ctrlResolucion.errors) {
                  @if (ctrlResolucion.errors['required']) {
                    <span class="text-xs text-red-500">Ingrese el N° de resolución.</span>
                  } @else if (ctrlResolucion.errors['pattern']) {
                    <span class="text-xs text-red-500">Solo letras, números y guiones (–).</span>
                  }
                }
              </div>
              <div>
                <label class="label-field">Fecha designación <span class="text-red-500">*</span></label>
                <input [formControl]="ctrlFechaDesignacion" type="date" class="input-field" [attr.max]="hoy" />
                @if (ctrlFechaDesignacion.touched && ctrlFechaDesignacion.errors) {
                  @if (ctrlFechaDesignacion.errors['required']) {
                    <span class="text-xs text-red-500">Seleccione la fecha de designación.</span>
                  } @else if (ctrlFechaDesignacion.errors['maxDate']) {
                    <span class="text-xs text-red-500">La fecha de designación no puede ser futura.</span>
                  }
                }
              </div>
            </div>

            <!-- Tarjeta de captura única -->
            <div class="card space-y-4">
              <h3 class="font-semibold text-gray-800 text-sm uppercase tracking-wide">+ Agregar miembro al comité</h3>

              <form [formGroup]="captureForm" (ngSubmit)="onAgregarALista()"
                    class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div>
                  <label class="label-field">Nombres completos <span class="text-red-500">*</span></label>
                  <input formControlName="nombresCompletos" class="input-field" maxlength="200"
                    placeholder="Nombres y apellidos completos"
                    (input)="sanitizarNombre($event, captureForm.controls['nombresCompletos'])" />
                  @if (captureForm.controls['nombresCompletos'].touched && captureForm.controls['nombresCompletos'].invalid) {
                    <span class="text-xs text-red-500">Obligatorio</span>
                  }
                </div>

                <div>
                  <label class="label-field">Cargo</label>
                  <input formControlName="cargo" class="input-field" maxlength="200"
                    placeholder="Ej. Director de RRHH"
                    (input)="sanitizarNombre($event, captureForm.controls['cargo'])" />
                </div>

                <div>
                  <label class="label-field">Rol en comité <span class="text-red-500">*</span></label>
                  <select formControlName="rolComite" class="input-field">
                    <option value="PRESIDENTE">Presidente</option>
                    <option value="SECRETARIO">Secretario</option>
                    <option value="VOCAL">Vocal</option>
                    <option value="SUPLENTE">Suplente</option>
                  </select>
                </div>

                <div>
                  <label class="label-field">Correo institucional <span class="text-red-500">*</span></label>
                  <input formControlName="email" class="input-field" maxlength="100"
                    placeholder="usuario@acffaa.gob.pe" type="email" />
                  @if (captureForm.controls['email'].touched && captureForm.controls['email'].errors) {
                    @if (captureForm.controls['email'].errors['required']) {
                      <span class="text-xs text-red-500">El correo institucional es obligatorio.</span>
                    } @else if (captureForm.controls['email'].errors['pattern']) {
                      <span class="text-xs text-red-500">Debe ser un correo &#64;acffaa.gob.pe válido.</span>
                    } @else if (captureForm.controls['email'].errors['maxlength']) {
                      <span class="text-xs text-red-500">Máximo 100 caracteres.</span>
                    }
                  }
                </div>

                <div class="flex items-end gap-4">
                  <label class="inline-flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <input type="checkbox" formControlName="esTitular" />
                    Titular
                  </label>
                  <button type="submit" class="btn-primary text-sm mb-2" [disabled]="captureForm.invalid">
                    Agregar a lista
                  </button>
                </div>
              </form>
            </div>

            <!-- Tabla local de miembros pendientes -->
            @if (batchMiembros().length > 0) {
              <div class="card space-y-4">
                <h3 class="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                  Miembros a registrar
                </h3>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="bg-[#1F2133] text-white">
                        <th class="px-3 py-2 text-left font-semibold text-xs">#</th>
                        <th class="px-3 py-2 text-left font-semibold text-xs">Nombres</th>
                        <th class="px-3 py-2 text-left font-semibold text-xs">Cargo</th>
                        <th class="px-3 py-2 text-center font-semibold text-xs">Rol</th>
                        <th class="px-3 py-2 text-center font-semibold text-xs">Titular</th>
                        <th class="px-3 py-2 text-left font-semibold text-xs">Correo</th>
                        <th class="px-3 py-2 text-center font-semibold text-xs">Quitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (m of batchMiembros(); track $index; let i = $index) {
                        <tr class="border-t hover:bg-gray-50 transition-colors">
                          <td class="px-3 py-2 text-gray-400 text-xs font-mono">{{ i + 1 }}</td>
                          <td class="px-3 py-2 font-medium text-gray-800">{{ m.nombresCompletos }}</td>
                          <td class="px-3 py-2 text-gray-600 text-xs">{{ m.cargo || '—' }}</td>
                          <td class="px-3 py-2 text-center">
                            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                              [class.bg-blue-100]="m.rolComite === 'PRESIDENTE'"
                              [class.text-blue-800]="m.rolComite === 'PRESIDENTE'"
                              [class.bg-purple-100]="m.rolComite === 'SECRETARIO'"
                              [class.text-purple-800]="m.rolComite === 'SECRETARIO'"
                              [class.bg-amber-100]="m.rolComite !== 'PRESIDENTE' && m.rolComite !== 'SECRETARIO'"
                              [class.text-amber-800]="m.rolComite !== 'PRESIDENTE' && m.rolComite !== 'SECRETARIO'">
                              {{ m.rolComite }}
                            </span>
                          </td>
                          <td class="px-3 py-2 text-center">{{ m.esTitular ? '✓' : '—' }}</td>
                          <td class="px-3 py-2 text-xs text-gray-600 font-mono">{{ m.email || '—' }}</td>
                          <td class="px-3 py-2 text-center">
                            <button class="btn-ghost text-xs text-red-600" (click)="quitarDeLista(i)">✕</button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <!-- Resumen dinámico -->
                <div class="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                  <div class="text-center">
                    <div class="text-xs text-gray-500 uppercase tracking-wide">Total miembros</div>
                    <div class="font-bold text-lg text-gray-800">{{ batchMiembros().length }}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-xs text-gray-500 uppercase tracking-wide">Roles base</div>
                    <div class="font-bold text-lg"
                      [class.text-green-600]="rolesBaseCompletosBatch()"
                      [class.text-red-500]="!rolesBaseCompletosBatch()">
                      {{ rolesBaseCompletosBatch() ? 'Completos' : 'Incompletos' }}
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-xs text-gray-500 uppercase tracking-wide">Titulares</div>
                    <div class="font-bold text-lg text-gray-800">{{ titularesBatch() }}</div>
                  </div>
                </div>
              </div>
            }

            @if (globalError()) {
              <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {{ globalError() }}
              </div>
            }

            <div class="flex items-center justify-end gap-3">
              <a [routerLink]="['/sistema/convocatoria', idConvocatoria, 'cronograma']" class="btn-ghost">
                ← Volver a cronograma
              </a>
              <button type="button" class="btn-primary"
                [disabled]="saving() || !puedeGuardarBatch()"
                (click)="onSubmitBatch()">
                {{ saving() ? 'Guardando...' : 'Guardar Comité' }}
              </button>
              <a [routerLink]="['/sistema/convocatoria', idConvocatoria, 'factores']"
                class="btn-primary"
                [class.opacity-50]="!comiteExistente()"
                [class.pointer-events-none]="!comiteExistente()"
                [attr.aria-disabled]="!comiteExistente()"
                [title]="comiteExistente() ? 'Ir a Factores' : 'Primero guarde el comité'">
                Continuar →
              </a>
            </div>
          </div>
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

      <app-confirm-dialog
        [open]="showLeaveConfirm()"
        title="Notificación al comité pendiente"
        message="Aún no ha usado «Notificar a Comité». Si sale ahora, los miembros no recibirán el aviso institucional hasta que regrese y complete ese paso. ¿Desea salir de todas formas?"
        confirmText="Sí, salir"
        cancelText="Permanecer"
        (confirm)="onLeaveConfirm()"
        (cancel)="onLeaveCancel()" />
    </div>
  `,
})
export class ComiteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly convocatoriaService = inject(ConvocatoriaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idConvocatoria = Number(this.route.snapshot.paramMap.get('id'));
  readonly modoLectura = this.route.snapshot.queryParamMap.get('modo') === 'lectura';
  readonly convocatoria = signal<ConvocatoriaResponse | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingMiembro = signal(false);
  readonly savingNotificar = signal(false);
  readonly notificandoId = signal<number | null>(null);
  readonly globalError = signal('');

  readonly comiteExistente = signal<ComiteDetalleResponse | null>(null);

  readonly isOrh = () => this.auth.hasAnyRole(['ROLE_ORH', 'ROLE_ADMIN']);
  readonly comiteConformado = () => this.comiteExistente()?.estado === 'COMITE_CONFORMADO';
  readonly muestraBotonNotificar = () => this.isOrh() && this.comiteExistente() && !this.comiteConformado();

  readonly comiteEstructuraConformada = computed(() => {
    const miembros = this.comiteExistente()?.miembros ?? [];
    if (miembros.length < 3) return false;
    const roles = miembros.map(m => m.rolComite);
    return ['PRESIDENTE', 'SECRETARIO', 'VOCAL'].every(r => roles.includes(r));
  });

  readonly puedeIrAFactores = computed(() => !!this.comiteExistente());

  // ── Métricas tabla existente ──
  readonly totalMiembrosExistente = computed(() => this.comiteExistente()?.miembros?.length ?? 0);
  readonly rolesBaseCompletosExistente = computed(() => {
    const roles = (this.comiteExistente()?.miembros ?? []).map(m => m.rolComite);
    return ['PRESIDENTE', 'SECRETARIO', 'VOCAL'].every(r => roles.includes(r));
  });
  readonly titularesExistente = computed(() =>
    (this.comiteExistente()?.miembros ?? []).filter(m => m.esTitular).length,
  );

  // ── Batch local ──
  readonly batchMiembros = signal<MiembroComiteItem[]>([]);
  readonly rolesBaseCompletosBatch = computed(() => {
    const roles = this.batchMiembros().map(m => m.rolComite);
    return ['PRESIDENTE', 'SECRETARIO', 'VOCAL'].every(r => roles.includes(r));
  });
  readonly titularesBatch = computed(() => this.batchMiembros().filter(m => m.esTitular).length);
  readonly puedeGuardarBatch = computed(() =>
    this.batchMiembros().length >= 3 &&
    this.rolesBaseCompletosBatch() &&
    this.resolucionStatus() === 'VALID' &&
    this.fechaStatus() === 'VALID',
  );

  // ── CRUD individual ──
  readonly editandoMiembro = signal(false);
  readonly idMiembroEditando = signal<number | null>(null);
  readonly showDeleteConfirm = signal(false);
  readonly miembroAEliminar = signal<MiembroDetalleItem | null>(null);
  readonly showLeaveConfirm = signal(false);
  private readonly leaveDecision$ = new Subject<boolean>();

  // ── Formulario de captura única (compartido entre batch y CRUD) ──
  readonly captureForm = this.fb.group({
    nombresCompletos: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(200)]),
    cargo: this.fb.control<string | null>(null),
    rolComite: this.fb.nonNullable.control('VOCAL', Validators.required),
    esTitular: this.fb.nonNullable.control(true),
    email: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(100),
      Validators.pattern(ACFFAA_EMAIL_PATTERN),
    ]),
  });

  // ── Controles de cabecera para el batch ──
  readonly ctrlResolucion = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.maxLength(80),
    Validators.pattern(/^[A-Z0-9\-]+$/),
  ]);
  readonly ctrlFechaDesignacion = this.fb.nonNullable.control('', [
    Validators.required,
    (control: any) => {
      if (!control.value) return null;
      return control.value > new Date().toISOString().substring(0, 10) ? { maxDate: true } : null;
    },
  ]);

  /** Fecha máxima aceptada para la fecha de designación (hoy) */
  readonly hoy = new Date().toISOString().substring(0, 10);

  // Signals reactivos del status de los controles (para que computed() los detecte)
  private readonly resolucionStatus = toSignal(
    this.ctrlResolucion.statusChanges.pipe(startWith(this.ctrlResolucion.status)),
  );
  private readonly fechaStatus = toSignal(
    this.ctrlFechaDesignacion.statusChanges.pipe(startWith(this.ctrlFechaDesignacion.status)),
  );

  /** Usado por `comiteCanDeactivateGuard`: confirma salida si falta notificar al comité. */
  confirmLeave(): Observable<boolean> | boolean {
    if (!this.shouldWarnLeave()) {
      return true;
    }
    this.showLeaveConfirm.set(true);
    return this.leaveDecision$.pipe(take(1));
  }

  private shouldWarnLeave(): boolean {
    if (this.loading()) return false;
    if (!this.isOrh()) return false;
    if (this.modoLectura) return false;
    const c = this.comiteExistente();
    if (!c) return false;
    if (c.estado === 'COMITE_CONFORMADO') return false;
    return this.comiteEstructuraConformada();
  }

  onLeaveConfirm(): void {
    this.showLeaveConfirm.set(false);
    this.leaveDecision$.next(true);
  }

  onLeaveCancel(): void {
    this.showLeaveConfirm.set(false);
    this.leaveDecision$.next(false);
  }

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
  // BATCH — Agregar a lista local y enviar todo
  // ═══════════════════════════════════════════════

  onAgregarALista(): void {
    this.globalError.set('');
    if (this.captureForm.invalid) {
      this.captureForm.markAllAsTouched();
      return;
    }
    const v = this.captureForm.getRawValue();
    const lista = this.batchMiembros();

    // Guard 1: rol único — PRESIDENTE y SECRETARIO solo puede haber uno
    const rolesUnicos = ['PRESIDENTE', 'SECRETARIO'];
    if (rolesUnicos.includes(v.rolComite) && lista.some(m => m.rolComite === v.rolComite)) {
      const label = v.rolComite === 'PRESIDENTE' ? 'Presidente' : 'Secretario';
      this.globalError.set(`Ya existe un ${label} en la lista. Solo puede haber uno por comité.`);
      this.toast.warning(`Ya existe un ${label} en el comité.`);
      return;
    }

    // Guard 2: email duplicado
    const emailNorm = v.email.trim().toLowerCase();
    if (lista.some(m => m.email?.toLowerCase() === emailNorm)) {
      this.globalError.set('Este correo institucional ya está registrado en la lista.');
      this.toast.warning('Correo duplicado en la lista del comité.');
      return;
    }

    this.batchMiembros.update(list => [...list, {
      idUsuario: null,
      nombresCompletos: v.nombresCompletos.trim(),
      cargo: v.cargo?.trim() || null,
      rolComite: v.rolComite,
      esTitular: v.esTitular,
      email: v.email.trim(),
    }]);
    this.captureForm.reset({ nombresCompletos: '', cargo: null, rolComite: 'VOCAL', esTitular: true, email: '' });
  }

  sanitizarNombre(event: Event, control: any): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value
      .replace(/[^A-Za-záéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜñÑ ]/g, '')
      .toUpperCase();
    input.value = limpio;
    control.setValue(limpio, { emitEvent: false });
  }

  sanitizarResolucion(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^A-Za-z0-9\-]/g, '').toUpperCase().slice(0, 80);
    input.value = limpio;
    // emitEvent requerido: puedeGuardarBatch usa toSignal(statusChanges); false dejaba el botón deshabilitado.
    this.ctrlResolucion.setValue(limpio, { emitEvent: true });
  }

  quitarDeLista(index: number): void {
    this.batchMiembros.update(list => list.filter((_, i) => i !== index));
  }

  onSubmitBatch(): void {
    this.globalError.set('');
    this.ctrlResolucion.markAsTouched();
    this.ctrlFechaDesignacion.markAsTouched();

    if (this.ctrlResolucion.invalid || this.ctrlFechaDesignacion.invalid) {
      this.toast.warning('Complete el número de resolución y la fecha de designación.');
      return;
    }
    if (this.batchMiembros().length < 3) {
      this.globalError.set('El comité debe tener al menos 3 miembros.');
      return;
    }
    if (!this.rolesBaseCompletosBatch()) {
      this.globalError.set('Debe registrar Presidente, Secretario y Vocal.');
      return;
    }

    const payload: ComiteRequest = {
      numeroResolucion: this.ctrlResolucion.value.trim(),
      fechaDesignacion: this.ctrlFechaDesignacion.value,
      miembros: this.batchMiembros(),
    };

    this.saving.set(true);
    this.convocatoriaService.registrarComite(this.idConvocatoria, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (_res: ApiResponse<ComiteResponse>) => {
          this.saving.set(false);
          this.batchMiembros.set([]);
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
  // CRUD INDIVIDUAL — Agregar / Editar / Eliminar / Notificar
  // ═══════════════════════════════════════════════

  onEditarMiembro(m: MiembroDetalleItem): void {
    this.editandoMiembro.set(true);
    this.idMiembroEditando.set(m.idMiembroComite);
    this.captureForm.patchValue({
      nombresCompletos: m.nombresCompletos,
      cargo: m.cargo ?? null,
      rolComite: m.rolComite,
      esTitular: m.esTitular,
      email: m.email ?? '',
    });
  }

  cancelarEdicion(): void {
    this.editandoMiembro.set(false);
    this.idMiembroEditando.set(null);
    this.captureForm.reset({ nombresCompletos: '', cargo: null, rolComite: 'VOCAL', esTitular: true, email: '' });
  }

  onGuardarMiembro(): void {
    this.globalError.set('');
    if (this.captureForm.invalid) {
      this.captureForm.markAllAsTouched();
      this.toast.warning('Complete todos los campos obligatorios.');
      return;
    }

    const v = this.captureForm.getRawValue();
    const req: MiembroComiteRequest = {
      nombresCompletos: v.nombresCompletos.trim(),
      cargo: v.cargo?.trim() || null,
      rolComite: v.rolComite,
      esTitular: v.esTitular,
      email: v.email.trim() || null,
    };

    this.savingMiembro.set(true);

    if (this.editandoMiembro() && this.idMiembroEditando()) {
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
      this.convocatoriaService.agregarMiembro(this.idConvocatoria, req)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.savingMiembro.set(false);
            this.toast.success('Miembro agregado.');
            this.captureForm.reset({ nombresCompletos: '', cargo: null, rolComite: 'VOCAL', esTitular: true, email: '' });
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

  onNotificarMiembro(m: MiembroDetalleItem): void {
    if (!m.email) return;
    this.notificandoId.set(m.idMiembroComite);
    this.convocatoriaService.notificarMiembro(this.idConvocatoria, m.idMiembroComite)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificandoId.set(null);
          // Actualización in-place: sin recargar la página completa
          const ahora = new Date().toISOString();
          this.comiteExistente.update(c => c ? {
            ...c,
            miembros: c.miembros.map(x =>
              x.idMiembroComite === m.idMiembroComite
                ? { ...x, fechaUltNotificacion: ahora }
                : x,
            ),
          } : c);
          this.toast.success(`Notificación enviada a ${m.email}`);
        },
        error: (err: { error?: { message?: string } }) => {
          this.notificandoId.set(null);
          this.toast.error(err.error?.message || 'No se pudo enviar la notificación.');
        },
      });
  }

  buildTooltipNotificar(m: MiembroDetalleItem): string {
    if (!m.email) return 'Sin correo registrado';
    if (m.fechaUltNotificacion) {
      const fecha = new Date(m.fechaUltNotificacion).toLocaleString('es-PE');
      return `Notificado el ${fecha} — Reenviar designación`;
    }
    return 'Notificar designación al miembro';
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

  // ═══════════════════════════════════════════════
  // CARGA
  // ═══════════════════════════════════════════════

  private cargarComiteExistente(): void {
    this.convocatoriaService.obtenerComite(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: ApiResponse<ComiteDetalleResponse>) => {
          this.comiteExistente.set(res.data ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.comiteExistente.set(null);
          this.loading.set(false);
        },
      });
  }
}
