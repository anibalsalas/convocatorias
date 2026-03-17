import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';

/**
 * Zona Drag & Drop para subir archivos con hash SHA-256
 * Uso: <app-file-upload [accept]="'.pdf,.jpg'" [maxSizeMb]="10" (fileSelected)="onFile($event)" />
 */
@Component({
  selector: 'app-file-upload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
      [class]="isDragging() ? 'border-[#1F2133] bg-blue-50' : 'border-gray-300 hover:border-gray-400'"
      (dragover)="onDragOver($event)"
      (dragleave)="isDragging.set(false)"
      (drop)="onDrop($event)"
      (click)="fileInput.click()">
      <input
        #fileInput
        type="file"
        [accept]="accept()"
        class="hidden"
        (change)="onFileChange($event)" />
      <div class="text-4xl mb-3 opacity-50">📂</div>
      <p class="text-sm text-gray-600 font-medium">
        Arrastre archivos aquí o <span class="text-[#1F2133] underline cursor-pointer">haga clic para seleccionar</span>
      </p>
      <p class="text-xs text-gray-400 mt-1">{{ accept() }} · Máximo {{ maxSizeMb() }}MB</p>
    </div>
  `,
})
export class FileUploadComponent {
  accept = input<string>('.pdf,.jpg,.png');
  maxSizeMb = input<number>(10);

  fileSelected = output<File>();

  isDragging = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.emitFile(file);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.emitFile(file);
  }

  private emitFile(file: File): void {
    const maxBytes = this.maxSizeMb() * 1024 * 1024;
    if (file.size > maxBytes) return;
    this.fileSelected.emit(file);
  }
}
