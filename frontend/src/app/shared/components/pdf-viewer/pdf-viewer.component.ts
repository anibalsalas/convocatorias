import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';

/**
 * Wrapper de pdf.js (Mozilla) para visor inline con zoom y paginación
 * Uso: <app-pdf-viewer [url]="pdfUrl" />
 * Implementación completa del visor en E2 (cuando se use para perfil PDF)
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
        @if (url()) {
          <iframe [src]="url()" class="w-full h-[600px] border-0" [style.transform]="'scale(' + zoom() / 100 + ')'"></iframe>
        } @else {
          <p class="text-gray-400 text-sm">No hay documento disponible</p>
        }
      </div>
    </div>
  `,
})
export class PdfViewerComponent {
  url = input<string>('');
  zoom = signal(100);

  zoomIn(): void { this.zoom.update(z => Math.min(200, z + 10)); }
  zoomOut(): void { this.zoom.update(z => Math.max(50, z - 10)); }
}
