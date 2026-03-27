import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConvocatoriaService } from '../../services/convocatoria.service';
import { ActaResponse, ConvocatoriaResponse } from '../../models/convocatoria.model';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { PdfViewerComponent } from '@shared/components/pdf-viewer/pdf-viewer.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-acta',
  standalone: true,
  imports: [RouterLink, DatePipe, PageHeaderComponent, StatusBadgeComponent, PdfViewerComponent],
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
            <button (click)="onGenerarActa()" class="btn-primary" [disabled]="generating() || uploading()">
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
                  Genera el acta y luego carga el PDF firmado para habilitar la aprobación final.
                </div>
              }
            } @else {
              <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Aún no se ha generado ningún acta para esta convocatoria.
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
    </div>
  `,
})
export class ActaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly convocatoriaService = inject(ConvocatoriaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

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

  readonly selectedFileName = computed(() => this.selectedFile()?.name ?? '');
  readonly actaEstado = computed(() => this.acta()?.firmada ? 'FIRMADA' : (this.acta()?.estado || 'PENDIENTE'));

  constructor() {
    if (!Number.isFinite(this.idConvocatoria) || this.idConvocatoria <= 0) {
      this.loadingConvocatoria.set(false);
      this.globalError.set('Identificador de convocatoria inválido.');
      return;
    }

    this.convocatoriaService.obtener(this.idConvocatoria)
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

  /** Carga el acta existente (si la hay) al entrar a la vista. */
  private cargarActaExistente(): void {
    this.convocatoriaService.obtenerActa(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.acta.set(res.data);
            if (res.data.firmada) {
              this.cargarPreviewDesdeBackend();
            }
          }
        },
        error: () => { /* silencioso: acta no existe aún */ },
      });
  }

  /** Solicita el PDF al backend (endpoint GET /acta-instalacion/pdf) y genera blob URL. */
  private cargarPreviewDesdeBackend(): void {
    this.convocatoriaService.descargarActaPdf(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.previewUrl.set(url);
        },
        error: () => { /* silencioso: archivo aún no existe en disco (E13 sin generación real) */ },
      });
  }

  onGenerarActa(): void {
    this.globalError.set('');
    this.generating.set(true);

    this.convocatoriaService.generarActaInstalacion(this.idConvocatoria)
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
      this.previewUrl.set('');
      return;
    }

    if (file.type !== 'application/pdf') {
      this.toast.warning('Solo se permite archivos PDF.');
      input.value = '';
      return;
    }

    this.selectedFile.set(file);
    const blobUrl = URL.createObjectURL(file);
    this.previewUrl.set(blobUrl);
  }

  onCargarActa(fechaFirma: string): void {
    this.globalError.set('');
    const file = this.selectedFile();
    if (!file) {
      this.toast.warning('Seleccione el PDF firmado antes de cargar.');
      return;
    }

    this.uploading.set(true);
    this.convocatoriaService.cargarActaFirmada(this.idConvocatoria, file, fechaFirma || null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.uploading.set(false);
          this.acta.set(response.data);
          this.toast.success(response.message || 'Acta firmada cargada correctamente.');
          // Preview ya fue seteado con blob URL al seleccionar el archivo.
          // También cargamos desde backend para que persista en recargas futuras.
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
    this.convocatoriaService.notificarActaOrh(this.idConvocatoria)
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
