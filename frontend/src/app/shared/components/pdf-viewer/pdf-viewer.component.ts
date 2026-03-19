import { Component, ChangeDetectionStrategy, input, signal, computed, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Wrapper inline de PDF con zoom.
 * Usa DomSanitizer para permitir blob: y http: URLs en iframe
 * (Angular los bloquea por defecto con unsafe:).
 */
@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-lg shadow border overflow-hidden">
      <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700">Documento PDF</span>
        <div class="flex items-center gap-2">
          <button (click)="zoomOut()" class="btn-ghost text-xs">−</button>
          <span class="text-xs text-gray-500">{{ zoom() }}%</span>
          <button (click)="zoomIn()" class="btn-ghost text-xs">+</button>
          @if (url()) {
            <a [href]="url()" target="_blank" download class="btn-ghost text-xs">⬇ Descargar</a>
          }
        </div>
      </div>
      <div class="p-4 min-h-[400px] flex items-center justify-center bg-gray-100">
        @if (safeUrl()) {
          <iframe [src]="safeUrl()" class="w-full h-[600px] border-0"
            [style.transform]="'scale(' + zoom() / 100 + ')'"></iframe>
        } @else {
          <p class="text-gray-400 text-sm">No hay documento disponible</p>
        }
      </div>
    </div>
  `,
})
export class PdfViewerComponent {
  private readonly sanitizer = inject(DomSanitizer);

  url = input<string>('');
  zoom = signal(100);

  /** Bypass necesario para blob: URLs generados por URL.createObjectURL() */
  readonly safeUrl = computed<SafeResourceUrl | null>(() => {
    const u = this.url();
    return u ? this.sanitizer.bypassSecurityTrustResourceUrl(u) : null;
  });

  zoomIn(): void { this.zoom.update(z => Math.min(200, z + 10)); }
  zoomOut(): void { this.zoom.update(z => Math.max(50, z - 10)); }
}
