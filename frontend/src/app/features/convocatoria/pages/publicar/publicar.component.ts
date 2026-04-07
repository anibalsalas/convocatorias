import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConvocatoriaService } from '../../services/convocatoria.service';
import { ConvocatoriaResponse } from '../../models/convocatoria.model';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '@core/services/toast.service';
import { SeleccionService } from '@features/seleccion/services/seleccion.service';
import { BancoPreguntaEstadoResponse } from '@features/seleccion/models/seleccion.model';

@Component({
  selector: 'app-publicar',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Aprobar y publicar convocatoria"
        subtitle="Publicación simultánea Portal ACFFAA + Talento Perú"
        [estado]="convocatoria()?.estado">
        <a [routerLink]="['/sistema/convocatoria', idConvocatoria, 'acta']" class="btn-ghost">← Volver a acta</a>
      </app-page-header>

      @if (loadingConvocatoria()) {
        <div class="card text-center py-12 text-gray-400">Cargando convocatoria...</div>
      } @else if (convocatoria()) {
        <div class="card space-y-4 border-l-4 border-l-[#1F2133]">
          <div>
            <h3 class="text-sm font-semibold text-gray-800 uppercase tracking-wide">Bases para publicación (obligatorio)</h3>
            <p class="text-xs text-gray-500 mt-1">
              Descargue el borrador generado por el sistema, consiga la versión firmada y regístrela aquí. Sin esto el backend rechazará la publicación (E15).
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button type="button" class="btn-outline text-sm" [disabled]="downloadingBorrador()"
              (click)="descargarBorradorBases()">
              {{ downloadingBorrador() ? 'Descargando...' : 'Descargar borrador PDF (E16)' }}
            </button>
            @if (convocatoria()?.basesFirmadasSubidas) {
              <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-green-100 text-green-800">
                Bases firmadas registradas
              </span>
              <button type="button" class="btn-ghost text-xs text-blue-700"
                (click)="verBasesFirmadas()">Vista previa PDF firmado</button>
            } @else {
              <span class="text-xs text-amber-700 font-medium">Pendiente: registrar PDF firmado</span>
            }
          </div>
          <div class="flex flex-wrap items-end gap-3 pt-1">
            <label class="btn-outline cursor-pointer text-sm shrink-0" [class.opacity-60]="uploadingBases()">
              {{ basesFileName() || 'Seleccionar PDF firmado' }}
              <input type="file" accept="application/pdf" class="hidden" [disabled]="uploadingBases()"
                (change)="onBasesFileSelected($event)" />
            </label>
            <button type="button" class="btn-primary text-sm"
              [disabled]="uploadingBases() || !pendingBasesFile()"
              (click)="registrarBasesFirmadas()">
              {{ uploadingBases() ? 'Registrando...' : (convocatoria()?.basesFirmadasSubidas ? 'Reemplazar bases firmadas' : 'Registrar bases firmadas') }}
            </button>
          </div>
          @if (convocatoria()?.fechaPdfBasesFirmado) {
            <p class="text-xs text-gray-500">Registrado: {{ convocatoria()?.fechaPdfBasesFirmado }}</p>
          }
        </div>

        <!-- Banco de preguntas: ya no bloquea publicación. Se solicita post-E24 en módulo selección -->

        <div class="card grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <div class="text-xs uppercase tracking-wide text-gray-500">Convocatoria</div>
              <div class="text-lg font-semibold text-gray-800">{{ convocatoria()?.numeroConvocatoria }}</div>
              <div class="text-sm text-gray-600 mt-1">{{ convocatoria()?.descripcion }}</div>
            </div>

            <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Porfavor Marca todos los Checklist para Aprobar y Publicar la Convocatoria
            </div>

            <div class="space-y-3 rounded-lg border border-gray-200 p-4">
              <label class="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" [checked]="checklist.actaFirmada()" (change)="onChecklistChange('actaFirmada', $event)" class="mt-1 accent-[#1F2133]" />
                <span>Confirmo que el acta de instalación está generada y firmada.</span>
              </label>
              <label class="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" [checked]="checklist.factores()" (change)="onChecklistChange('factores', $event)" class="mt-1 accent-[#1F2133]" />
                <span>Confirmo que los factores y pesos fueron revisados por etapa.</span>
              </label>
              <label class="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" [checked]="checklist.cronograma()" (change)="onChecklistChange('cronograma', $event)" class="mt-1 accent-[#1F2133]" />
                <span>Confirmo que el cronograma quedó validado.</span>
              </label>
              <label class="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" [checked]="checklist.publicacionSimultanea()" (change)="onChecklistChange('publicacionSimultanea', $event)" class="mt-1 accent-[#1F2133]" />
                <span>Confirmo publicación simultánea Portal ACFFAA + Talento Perú (D.S. 065-2011-PCM).</span>
              </label>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="onRequestPublish()" class="space-y-4">
            <div [class.hidden]="form.get('linkTalentoPeru')?.disabled">
              <label class="label-field">Link Talento Perú</label>
              <input formControlName="linkTalentoPeru" class="input-field" placeholder="https://talentoperu.servir.gob.pe/..." />
            </div>
            <div>
              <label class="label-field">Link Portal ACFFAA</label>
              <input formControlName="linkPortalAcffaa" readonly class="input-field" placeholder="https://www.acffaa.gob.pe/convocatorias/..." />
            </div>

            @if (globalError()) {
              <div
                role="alert"
                class="rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-4 shadow-sm ring-1 ring-red-100/80">
                <div class="flex gap-3">
                  <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 text-sm font-bold"
                    aria-hidden="true">!</span>
                  <div class="min-w-0 space-y-1">
                    <p class="text-sm font-semibold text-red-950">No se pudo completar la publicación</p>
                    <p class="text-sm text-red-900/90 leading-relaxed whitespace-pre-wrap">{{ globalError() }}</p>
                  </div>
                </div>
              </div>
            }

            <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Al aprobar, el estado cambia directamente a <strong>PUBLICADA</strong> (D6 — no hay estado intermedio APROBADA persistido).
            </div>

            <div class="flex items-center justify-end gap-3">
              <a [routerLink]="['/sistema/convocatoria']" class="btn-ghost">Cancelar</a>
              <button type="submit" class="btn-primary" [disabled]="saving() || !canPublish()">
                {{ saving() ? 'Publicando...' : 'Aprobar y publicar' }}
              </button>
            </div>
          </form>
        </div>
      } @else {
        <div class="card text-center py-12 text-gray-400">No se pudo cargar la convocatoria.</div>
      }

      <!-- G2 FIX: ConfirmDialog institucional en vez de window.confirm -->
      <app-confirm-dialog
        [open]="showConfirm()"
        title="Confirmar publicación"
        message="¿Confirma que desea aprobar y publicar esta convocatoria? Esta acción es irreversible y la convocatoria será visible en el portal público."
        confirmText="Sí, publicar"
        [confirmDanger]="false"
        (confirm)="onConfirmPublish()"
        (cancel)="showConfirm.set(false)" />
    </div>
  `,
})
export class PublicarComponent {
  /** Alineado con validación backend (examen virtual). */
  readonly minBancoPreguntasPublicacion = 20;

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly convocatoriaService = inject(ConvocatoriaService);
  private readonly seleccionService = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idConvocatoria = Number(this.route.snapshot.paramMap.get('id'));
  readonly convocatoria = signal<ConvocatoriaResponse | null>(null);
  readonly loadingConvocatoria = signal(true);
  readonly saving = signal(false);
  readonly globalError = signal('');
  readonly showConfirm = signal(false);
  readonly bancoEstado = signal<BancoPreguntaEstadoResponse | null>(null);
  readonly bancoEstadoLoading = signal(false);
  readonly downloadingBorrador = signal(false);
  readonly uploadingBases = signal(false);
  readonly basesFileName = signal('');
  readonly pendingBasesFile = signal<File | null>(null);

  readonly checklist = {
    actaFirmada: signal(false),
    factores: signal(false),
    cronograma: signal(false),
    publicacionSimultanea: signal(false),
  };

  /** `undefined` en API se trata como habilitado (coherente con dominio backend). */
  readonly examenVirtualActivo = computed(
    () => this.convocatoria()?.examenVirtualHabilitado !== false,
  );

  readonly form = this.fb.nonNullable.group({
    linkTalentoPeru: ['', [Validators.maxLength(500)]],
    linkPortalAcffaa: ['', [Validators.maxLength(500)]],
  });

  // La publicación en Talento Perú no aplica — solo se publica en portal ACFFAA.
  // disable() excluye el campo del JSON enviado al backend.
  _ = this.form.controls.linkTalentoPeru.disable();

  constructor() {
    if (!Number.isFinite(this.idConvocatoria) || this.idConvocatoria <= 0) {
      this.loadingConvocatoria.set(false);
      return;
    }
    this.convocatoriaService.obtener(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.convocatoria.set(r.data);
          this.loadingConvocatoria.set(false);
          this.cargarEstadoBancoSiAplica(r.data);
          if (r.data.linkTalentoPeru) this.form.controls.linkTalentoPeru.setValue(r.data.linkTalentoPeru);
          // Si ya fue publicada, muestra el link guardado.
          // Si aún no, pre-rellena el URL esperado para que ORH lo verifique antes de confirmar.
          // El backend generará este mismo link automáticamente si el campo llega vacío.
          if (r.data.linkPortalAcffaa) {
            this.form.controls.linkPortalAcffaa.setValue(r.data.linkPortalAcffaa);
          } else if (r.data.numeroConvocatoria) {
            this.form.controls.linkPortalAcffaa.setValue(
              `${window.location.origin}/portal/convocatorias/${r.data.numeroConvocatoria}`
            );
          }
        },
        error: () => this.loadingConvocatoria.set(false),
      });
  }

  private cargarEstadoBancoSiAplica(data: ConvocatoriaResponse): void {
    if (data.examenVirtualHabilitado === false) return;
    this.bancoEstadoLoading.set(true);
    this.bancoEstado.set(null);
    this.seleccionService
      .estadoBancoPreguntas(data.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (estado) => {
          this.bancoEstado.set(estado);
          this.bancoEstadoLoading.set(false);
        },
        error: () => {
          this.bancoEstadoLoading.set(false);
        },
      });
  }

  canPublish(): boolean {
    return this.convocatoria()?.basesFirmadasSubidas === true
      && this.checklist.actaFirmada()
      && this.checklist.factores()
      && this.checklist.cronograma()
      && this.checklist.publicacionSimultanea();
  }

  descargarBorradorBases(): void {
    this.downloadingBorrador.set(true);
    this.convocatoriaService.descargarBasesPdf(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.downloadingBorrador.set(false);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bases_borrador_${this.convocatoria()?.numeroConvocatoria ?? this.idConvocatoria}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.downloadingBorrador.set(false);
          this.toast.error('No se pudo descargar el borrador de bases.');
        },
      });
  }

  onBasesFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.pendingBasesFile.set(null);
      this.basesFileName.set('');
      return;
    }
    if (file.type !== 'application/pdf') {
      this.toast.warning('Solo se permite PDF.');
      input.value = '';
      return;
    }
    this.pendingBasesFile.set(file);
    this.basesFileName.set(file.name);
  }

  registrarBasesFirmadas(): void {
    const file = this.pendingBasesFile();
    if (!file) return;
    this.uploadingBases.set(true);
    this.globalError.set('');
    this.convocatoriaService.cargarBasesPdfFirmado(this.idConvocatoria, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.uploadingBases.set(false);
          this.convocatoria.set(r.data);
          this.pendingBasesFile.set(null);
          this.basesFileName.set('');
          this.toast.success(r.message || 'Bases firmadas registradas.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.uploadingBases.set(false);
          this.globalError.set(err.error?.message || 'No se pudo registrar el PDF.');
          this.toast.error(this.globalError());
        },
      });
  }

  verBasesFirmadas(): void {
    this.convocatoriaService.descargarBasesPdfFirmado(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank', 'noopener,noreferrer');
        },
        error: () => this.toast.error('No se pudo abrir el PDF firmado.'),
      });
  }

  onChecklistChange(field: 'actaFirmada' | 'factores' | 'cronograma' | 'publicacionSimultanea', event: Event): void {
    this.checklist[field].set((event.target as HTMLInputElement).checked);
  }

  /** Step 1: Validate + show ConfirmDialog */
  onRequestPublish(): void {
    this.globalError.set('');
    if (!this.canPublish()) {
      this.toast.warning(this.mensajeBloqueoPublicacion());
      return;
    }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.showConfirm.set(true);
  }

  /** Step 2: User confirmed → call E15 */
  onConfirmPublish(): void {
    this.showConfirm.set(false);
    this.saving.set(true);
    const payload = {
      aprobada: true,
      linkTalentoPeru: this.form.controls.linkTalentoPeru.value.trim() || null,
      linkPortalAcffaa: this.form.controls.linkPortalAcffaa.value.trim() || null,
    };
    this.convocatoriaService.aprobar(this.idConvocatoria, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.saving.set(false);
          this.toast.success(r.message || 'Convocatoria publicada correctamente.');
          this.router.navigate(['/sistema/convocatoria', this.idConvocatoria, 'bases']);
        },
        error: (err: { error?: { message?: string } }) => {
          this.saving.set(false);
          const detail = err.error?.message || 'No se pudo aprobar.';
          this.globalError.set(detail);
          if (err.error?.message) {
            this.toast.warning('Revise el mensaje indicado debajo.');
          } else {
            this.toast.error(detail);
          }
        },
      });
  }

  private mensajeBloqueoPublicacion(): string {
    if (this.convocatoria()?.basesFirmadasSubidas !== true) {
      return 'Registre primero el PDF de bases firmadas y complete el checklist.';
    }
    return 'Complete el checklist de confirmación.';
  }
}
