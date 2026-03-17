import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="text-5xl mb-4 opacity-40">{{ icon() }}</div>
      <h3 class="text-lg font-semibold text-gray-700 mb-1">{{ title() }}</h3>
      <p class="text-sm text-gray-400 max-w-sm">{{ message() }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  icon = input<string>('📋');
  title = input<string>('No hay datos');
  message = input<string>('No se encontraron registros para mostrar.');
}
