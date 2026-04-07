import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subject, take } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { SistemaPendingExitService } from '@core/services/sistema-pending-exit.service';
import { ConvocatoriaService } from '../../services/convocatoria.service';
import { ActaResponse, ConvocatoriaResponse } from '../../models/convocatoria.model';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { PdfViewerComponent } from '@shared/components/pdf-viewer/pdf-viewer.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-acta',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    PageHeaderComponent,
    StatusBadgeComponent,
    PdfViewerComponent,
    ConfirmDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Acta de instalación"
        subtitle="E13–E14 · Generar acta y cargar versión firmada"
        [estado]="convocatoria()?.estado">
        <a [routerLink]="['/sistema/convocatoria', idConvocatoria, 'factores']" class="btn-ghost">← Volver a factores</a>
      </app-page-header>

      @if (modoLectura) {
        <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Solo lectura — la convocatoria ya fue publicada. No se pueden realizar cambios.
        </div>
      }

      @if (loadingConvocatoria()) {
        <div class="card text-center py-12 text-gray-400">Cargando convocatoria...</div>
      } @else if (convocatoria()) {
        <div class="card grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="text-xs uppercase tracking-wide text-gray-500">Convocatoria</div>
            <div class="font-semibold text-gray-800">{{ convocatoria()?.numeroConvocatoria }}</div>
            <div class="text-sm text-gray-600 mt-1">{{ convocatoria()?.descripcion }}</div>
          </div>
          <div>
            <div class="text-xs uppercase tracking-wide text-gray-500">Requerimiento</div>
            <div class="font-semibold text-gray-800">{{ convocatoria()?.requerimiento?.numeroRequerimiento || '—' }}</div>
          </div>
        </div>

        @if (!modoLectura) {
          <div class="card flex flex-wrap items-center gap-3">
            <button
              (click)="onGenerarActa()"
              class="btn-primary"
              [disabled]="generating() || uploading() || actaYaGenerada()"
              [title]="actaYaGenerada() ? 'Acta ya generada para esta convocatoria.' : 'Generar PDF del acta de instalación'">
              {{ generating() ? 'Generando...' : 'Generar acta de instalación' }}
            </button>

            <label class="btn-outline cursor-pointer" [class.opacity-60]="uploading()">
              {{ selectedFileName() || 'Seleccionar PDF firmado' }}
              <input type="file" accept="application/pdf" class="hidden" (change)="onFileSelected($event)" />
            </label>

            <div>
              <label class="label-field">Fecha de firma</label>
              <input #fechaFirmaInput type="date" class="input-field min-w-40" />
            </div>

            <button
              (click)="onCargarActa(fechaFirmaInput.value)"
              class="btn-primary"
              [disabled]="!selectedFile() || uploading() || generating()">
              {{ uploading() ? 'Cargando...' : 'Cargar acta firmada' }}
            </button>
          </div>
        }

        @if (globalError()) {
          <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ globalError() }}</div>
        }

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-semibold text-gray-800">Estado del acta</div>
                <div class="text-xs text-gray-500">El backend valida firma antes de publicar.</div>
              </div>
              @if (acta()) {
                <app-status-badge [estado]="actaEstado()" [label]="actaEstado()" />
              }
            </div>

            @if (acta()) {
              <dl class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt class="text-gray-500">Número acta</dt>
                  <dd class="font-medium text-gray-800">{{ acta()?.numeroActa || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-gray-500">Tipo acta</dt>
                  <dd class="font-medium text-gray-800">{{ acta()?.tipoActa || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-gray-500">Fecha acta</dt>
                  <dd class="font-medium text-gray-800">{{ acta()?.fechaActa ? (acta()?.fechaActa! | date:'dd/MM/yyyy') : '—' }}</dd>
                </div>
                <div>
                  <dt class="text-gray-500">Fecha firma</dt>
                  <dd class="font-medium text-gray-800">{{ acta()?.fechaCargaFirma ? (acta()?.fechaCargaFirma! | date:'dd/MM/yyyy') : 'Pendiente' }}</dd>
                </div>
                <div class="md:col-span-2">
                  <dt class="text-gray-500">Ruta generada</dt>
                  <dd class="font-mono text-xs text-gray-700 break-all">{{ acta()?.rutaArchivoPdf || 'No disponible aún' }}</dd>
                </div>
              </dl>

              @if (acta()?.firmada) {
                <div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  Acta firmada correctamente. Ya puede continuar al paso de publicación.
                </div>
              } @else {
                <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  El acta ya fue generada. Cargue el PDF firmado y la fecha de firma para habilitar la notificación a ORH.
                </div>
              }
            } @else {
              <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 space-y-2">
                <p>Aún no se ha generado ningún acta para esta convocatoria.</p>
                <p class="text-amber-800 font-medium">Genere el acta y luego cargue el PDF firmado para habilitar la aprobación final.</p>
              </div>
            }

            @if (!modoLectura) {
              <div class="flex justify-end">
                @if (convocatoria()?.notificacionActaEnviada) {
                  <button class="btn-primary opacity-70 cursor-default" disabled
                    title="Notificación ya enviada a ORH">
                    ✓ ORH notificado
                  </button>
                } @else {
                  <button
                    (click)="onNotificarOrh()"
                    class="btn-primary"
                    [disabled]="!acta()?.firmada || notificando()"
                    title="Al Notificar a ORH ésta convocatoria ya está lista para su publicación.">
                    {{ notificando() ? 'Notificando...' : 'Notificar a ORH' }}
                  </button>
                }
              </div>
            }
          </div>

          <div class="card">
            @if (previewUrl()) {
              <app-pdf-viewer [url]="previewUrl()" />
            } @else {
              <div class="h-full min-h-[320px] flex items-center justify-center text-center text-sm text-gray-500">
                <div>
                  <p class="font-medium text-gray-700">Vista previa no disponible</p>
                  <p class="mt-2">Genere el acta o cargue el PDF firmado para ver la vista previa.</p>
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="card text-center py-12 text-gray-400">No se pudo cargar la convocatoria.</div>
      }

      <app-confirm-dialog
        [open]="showLeaveConfirm()"
        [title]="leaveDialogTitle()"
        [message]="leaveDialogMessage()"
        confirmText="Sí, salir"
        cancelText="Permanecer"
        (confirm)="onLeaveConfirm()"
        (cancel)="onLeaveCancel()" />
    </div>
  `,
})
export class ActaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly convocatoriaService = inject(ConvocatoriaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly pendingExit = inject(SistemaPendingExitService);

  readonly idConvocatoria = Number(this.route.snapshot.paramMap.get('id'));
  readonly modoLectura = this.route.snapshot.queryParamMap.get('modo') === 'lectura';
  readonly convocatoria = signal<ConvocatoriaResponse | null>(null);
  readonly acta = signal<ActaResponse | null>(null);
  readonly loadingConvocatoria = signal(true);
  readonly generating = signal(false);
  readonly uploading = signal(false);
  readonly globalError = signal('');
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string>('');

  readonly notificando = signal(false);
  readonly showLeaveConfirm = signal(false);
  readonly leaveDialogTitle = signal('');
  readonly leaveDialogMessage = signal('');
  private readonly leaveDecision$ = new Subject<boolean>();

  readonly selectedFileName = computed(() => this.selectedFile()?.name ?? '');
  readonly actaEstado = computed(() => (this.acta()?.firmada ? 'FIRMADA' : (this.acta()?.estado || 'PENDIENTE')));
  readonly actaYaGenerada = computed(() => this.acta() !== null);

  constructor() {
    this.pendingExit.registerCheck(() => this.confirmLeave());
    this.destroyRef.onDestroy(() => {
      this.pendingExit.clearCheck();
      this.revokePreviewUrl();
    });

    if (!Number.isFinite(this.idConvocatoria) || this.idConvocatoria <= 0) {
      this.loadingConvocatoria.set(false);
      this.globalError.set('Identificador de convocatoria inválido.');
      return;
    }

    this.convocatoriaService
      .obtener(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.convocatoria.set(response.data);
          this.loadingConvocatoria.set(false);
          this.cargarActaExistente();
        },
        error: () => {
          this.loadingConvocatoria.set(false);
          this.globalError.set('No se pudo cargar la convocatoria.');
        },
      });
  }

  /** Usado por `actaCanDeactivateGuard` y por `SistemaPendingExitService` (Salir). */
  confirmLeave(): Observable<boolean> | boolean {
    if (!this.shouldWarnLeave()) {
      return true;
    }
    const copy = this.buildLeaveDialogCopy();
    this.leaveDialogTitle.set(copy.title);
    this.leaveDialogMessage.set(copy.message);
    this.showLeaveConfirm.set(true);
    return this.leaveDecision$.pipe(take(1));
  }

  private shouldWarnLeave(): boolean {
    if (this.modoLectura) return false;
    if (!this.auth.hasAnyRole(['ROLE_COMITE', 'ROLE_ADMIN'])) return false;
    const a = this.acta();
    const c = this.convocatoria();
    if (!a) return false;
    if (!a.firmada) return true;
    return !c?.notificacionActaEnviada;
  }

  private buildLeaveDialogCopy(): { title: string; message: string } {
    const a = this.acta()!;
    if (!a.firmada) {
      return {
        title: 'Carga de acta pendiente',
        message:
          'Aún debe cargar el PDF del acta firmado e indicar la fecha de firma. Si sale ahora, ese paso quedará pendiente. ¿Desea salir de todas formas?',
      };
    }
    return {
      title: 'Notificación a ORH pendiente',
      message:
        'Aún debe usar «Notificar a ORH» para que la convocatoria pueda continuar hacia publicación. Si sale ahora, ese aviso quedará pendiente. ¿Desea salir de todas formas?',
    };
  }

  onLeaveConfirm(): void {
    this.showLeaveConfirm.set(false);
    this.leaveDecision$.next(true);
  }

  onLeaveCancel(): void {
    this.showLeaveConfirm.set(false);
    this.leaveDecision$.next(false);
  }

  /** Carga el acta existente (si la hay) al entrar a la vista. */
  private cargarActaExistente(): void {
    this.convocatoriaService
      .obtenerActa(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.acta.set(res.data);
            if (res.data.rutaArchivoPdf || res.data.firmada) {
              this.cargarPreviewDesdeBackend();
            }
          }
        },
        error: () => {
          /* silencioso: acta no existe aún */
        },
      });
  }

  private revokePreviewUrl(): void {
    const prev = this.previewUrl();
    if (prev && prev.startsWith('blob:')) {
      URL.revokeObjectURL(prev);
    }
  }

  private setPreviewUrl(url: string): void {
    this.revokePreviewUrl();
    this.previewUrl.set(url);
  }

  /** Solicita el PDF al backend (endpoint GET /acta-instalacion/pdf) y genera blob URL. */
  private cargarPreviewDesdeBackend(): void {
    this.convocatoriaService
      .descargarActaPdf(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.setPreviewUrl(URL.createObjectURL(blob));
        },
        error: () => {
          /* silencioso: archivo aún no existe en disco */
        },
      });
  }

  onGenerarActa(): void {
    this.globalError.set('');
    this.generating.set(true);

    this.convocatoriaService
      .generarActaInstalacion(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.generating.set(false);
          this.acta.set(response.data);
          this.cargarPreviewDesdeBackend();
          this.toast.success(response.message || 'Acta generada correctamente.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.generating.set(false);
          this.globalError.set(err.error?.message || 'No se pudo generar el acta.');
          this.toast.error(this.globalError());
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.selectedFile.set(null);
      this.setPreviewUrl('');
      return;
    }

    if (file.type !== 'application/pdf') {
      this.toast.warning('Solo se permite archivos PDF.');
      input.value = '';
      return;
    }

    this.selectedFile.set(file);
    this.setPreviewUrl(URL.createObjectURL(file));
  }

  onCargarActa(fechaFirma: string): void {
    this.globalError.set('');
    const file = this.selectedFile();
    if (!file) {
      this.toast.warning('Seleccione el PDF firmado antes de cargar.');
      return;
    }

    this.uploading.set(true);
    this.convocatoriaService
      .cargarActaFirmada(this.idConvocatoria, file, fechaFirma || null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.uploading.set(false);
          this.acta.set(response.data);
          this.toast.success(response.message || 'Acta firmada cargada correctamente.');
          this.cargarPreviewDesdeBackend();
        },
        error: (err: { error?: { message?: string } }) => {
          this.uploading.set(false);
          this.globalError.set(err.error?.message || 'No se pudo cargar el acta firmada.');
          this.toast.error(this.globalError());
        },
      });
  }

  onNotificarOrh(): void {
    this.globalError.set('');
    this.notificando.set(true);
    this.convocatoriaService
      .notificarActaOrh(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.notificando.set(false);
          this.convocatoria.set(response.data);
          this.toast.success(response.message || 'ORH notificado correctamente.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.notificando.set(false);
          this.globalError.set(err.error?.message || 'No se pudo notificar a ORH.');
          this.toast.error(this.globalError());
        },
      });
  }
}
