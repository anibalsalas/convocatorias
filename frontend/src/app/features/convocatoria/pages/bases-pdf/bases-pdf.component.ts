import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ConvocatoriaService } from '../../services/convocatoria.service';
import { ConvocatoriaResponse } from '../../models/convocatoria.model';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-bases-pdf',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Bases de la convocatoria"
        subtitle="E16 · Visualización interna del PDF generado"
        [estado]="convocatoria()?.estado">
        <a routerLink="/sistema/convocatoria" class="btn-ghost" aria-label="Volver al listado de convocatorias">← Volver al listado</a>
        @if (pdfUrl()) {
          <button (click)="descargar()" class="btn-primary" aria-label="Descargar PDF de bases">⬇ Descargar PDF</button>
        }
      </app-page-header>

      @if (loading()) {
        <div class="card text-center py-16 text-gray-400" role="status">
          <span class="animate-pulse">Generando bases PDF...</span>
        </div>
      } @else if (pdfUrl()) {
        <div class="bg-white rounded-lg shadow border overflow-hidden">
          <iframe
            [src]="pdfUrl()!"
            class="w-full border-0"
            style="height: 80vh; min-height: 500px;"
            title="Bases de la convocatoria PDF"
            aria-label="Vista previa del documento PDF de bases de la convocatoria">
          </iframe>
        </div>
      } @else {
        <div class="card text-center py-16 text-gray-400" role="alert">
          No se pudo generar el PDF de bases para esta convocatoria.
        </div>
      }
    </div>
  `,
})
export class BasesPdfComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly convocatoriaService = inject(ConvocatoriaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idConvocatoria = Number(this.route.snapshot.paramMap.get('id'));
  readonly convocatoria = signal<ConvocatoriaResponse | null>(null);
  readonly loading = signal(true);
  readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  private blobUrl: string | null = null;

  constructor() {
    if (!Number.isFinite(this.idConvocatoria) || this.idConvocatoria <= 0) {
      this.loading.set(false);
      return;
    }

    this.convocatoriaService.obtener(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (response) => this.convocatoria.set(response.data) });

    this.convocatoriaService.descargarBasesPdf(this.idConvocatoria)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.blobUrl = URL.createObjectURL(blob);
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl));
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('No se pudo generar o descargar las bases PDF.');
        },
      });
  }

  descargar(): void {
    if (!this.blobUrl) return;
    const anchor = document.createElement('a');
    anchor.href = this.blobUrl;
    anchor.download = `bases_${this.idConvocatoria}.pdf`;
    anchor.click();
  }

  ngOnDestroy(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
    }
  }
}
