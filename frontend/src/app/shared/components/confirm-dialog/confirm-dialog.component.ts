import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

/**
 * Modal de confirmación reutilizable
 * Uso: <app-confirm-dialog [open]="showDialog" [title]="'¿Eliminar?'" (confirm)="onConfirm()" (cancel)="onCancel()" />
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50" (click)="cancel.emit()"></div>
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 relative z-10">
          <h3 class="text-lg font-bold text-gray-800 mb-2">{{ title() }}</h3>
          <p class="text-sm text-gray-600 mb-6">{{ message() }}</p>
          <div class="flex gap-3 justify-end">
            <button (click)="cancel.emit()" class="btn-ghost">{{ cancelText() }}</button>
            <button
              (click)="confirm.emit()"
              [class]="confirmDanger() ? 'btn-danger' : 'btn-primary'">
              {{ confirmText() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  open = input<boolean>(false);
  title = input<string>('Confirmar acción');
  message = input<string>('¿Está seguro de realizar esta acción?');
  confirmText = input<string>('Confirmar');
  /** Etiqueta del botón que cancela (no confirma) la acción. */
  cancelText = input<string>('Cancelar');
  confirmDanger = input<boolean>(false);

  confirm = output<void>();
  cancel = output<void>();
}
