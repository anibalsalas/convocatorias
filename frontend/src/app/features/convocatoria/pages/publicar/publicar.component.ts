import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConvocatoriaService } from '../../services/convocatoria.service';
import { ConvocatoriaResponse } from '../../models/convocatoria.model';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-publicar',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Aprobar y publicar convocatoria"
        subtitle="E15 · Publicación simultánea Portal ACFFAA + Talento Perú"
        [estado]="convocatoria()?.estado">
        <a [routerLink]="['/sistema/convocatoria', idConvocatoria, 'acta']" class="btn-ghost">← Volver a acta</a>
      </app-page-header>

      @if (loadingConvocatoria()) {
        <div class="card text-center py-12 text-gray-400">Cargando convocatoria...</div>
      } @else if (convocatoria()) {
        <div class="card grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <div class="text-xs uppercase tracking-wide text-gray-500">Convocatoria</div>
              <div class="text-lg font-semibold text-gray-800">{{ convocatoria()?.numeroConvocatoria }}</div>
              <div class="text-sm text-gray-600 mt-1">{{ convocatoria()?.descripcion }}</div>
            </div>

            <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              El checklist es una guía UX. El backend valida que acta, factores y cronograma estén registrados antes de aprobar.
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
            <div>
              <label class="label-field">Link Talento Perú</label>
              <input formControlName="linkTalentoPeru" class="input-field" placeholder="https://talentoperu.servir.gob.pe/..." />
            </div>
            <div>
              <label class="label-field">Link Portal ACFFAA</label>
              <input formControlName="linkPortalAcffaa" class="input-field" placeholder="https://www.acffaa.gob.pe/convocatorias/..." />
            </div>

            @if (globalError()) {
              <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ globalError() }}</div>
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
  readonly showConfirm = signal(false);

  readonly checklist = {
    actaFirmada: signal(false),
    factores: signal(false),
    cronograma: signal(false),
    publicacionSimultanea: signal(false),
  };

  readonly form = this.fb.nonNullable.group({
    linkTalentoPeru: ['', [Validators.maxLength(500)]],
    linkPortalAcffaa: ['', [Validators.maxLength(500)]],
  });

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
          if (r.data.linkTalentoPeru) this.form.controls.linkTalentoPeru.setValue(r.data.linkTalentoPeru);
          if (r.data.linkPortalAcffaa) this.form.controls.linkPortalAcffaa.setValue(r.data.linkPortalAcffaa);
        },
        error: () => this.loadingConvocatoria.set(false),
      });
  }

  canPublish(): boolean {
    return this.checklist.actaFirmada()
      && this.checklist.factores()
      && this.checklist.cronograma()
      && this.checklist.publicacionSimultanea();
  }

  onChecklistChange(field: 'actaFirmada' | 'factores' | 'cronograma' | 'publicacionSimultanea', event: Event): void {
    this.checklist[field].set((event.target as HTMLInputElement).checked);
  }

  /** Step 1: Validate + show ConfirmDialog */
  onRequestPublish(): void {
    this.globalError.set('');
    if (!this.canPublish()) { this.toast.warning('Complete el checklist.'); return; }
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
          this.globalError.set(err.error?.message || 'No se pudo aprobar.');
          this.toast.error(this.globalError());
        },
      });
  }
}
