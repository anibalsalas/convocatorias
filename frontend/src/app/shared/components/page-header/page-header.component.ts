import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-start justify-between mb-4">
      <div>
        <h1 class="text-xl font-bold text-gray-800">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="text-xs text-gray-500 mt-0.5">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex items-center gap-2">
        @if (estado()) {
          <app-status-badge [estado]="estado()!" [label]="estado()!" />
        }
        <ng-content />
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>();
  estado = input<string>();
}
