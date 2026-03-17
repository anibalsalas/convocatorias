import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { PerfilPuestoService } from '../../services/perfil-puesto.service';

@Component({
  selector: 'app-perfil-pdf',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header title="Perfil del Puesto — PDF" subtitle="Vista previa generada según RPE 065-2020-SERVIR">
        <a routerLink="/sistema/requerimiento/perfiles" class="btn-ghost">← Volver</a>
        @if (pdfUrl()) {
          <button (click)="descargar()" class="btn-outline">⬇ Descargar PDF</button>
        }
      </app-page-header>

      @if (loading()) {
        <div class="card text-center py-16 text-gray-400">Generando PDF...</div>
      } @else if (pdfUrl()) {
        <div class="bg-white rounded-lg shadow border overflow-hidden">
          <iframe [src]="pdfUrl()!" class="w-full" style="height: 80vh; border: none;" title="Perfil de puesto PDF"></iframe>
        </div>
      } @else {
        <div class="card text-center py-16 text-gray-400">No se pudo generar el PDF.</div>
      }
    </div>
  `,
})
export class PerfilPdfComponent implements OnInit, OnDestroy {
  private readonly svc = inject(PerfilPuestoService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  private blobUrl: string | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);
    this.svc.descargarPdf(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        this.blobUrl = URL.createObjectURL(pdfBlob);
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  descargar(): void {
    if (!this.blobUrl) {
      return;
    }
    const link = document.createElement('a');
    link.href = this.blobUrl;
    link.download = `perfil_puesto_${this.route.snapshot.params['id']}.pdf`;
    link.click();
  }

  ngOnDestroy(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
    }
  }
}
