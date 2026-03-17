import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-pulse space-y-3">
      @for (i of rows(); track i) {
        <div class="flex gap-4">
          @for (j of cols(); track j) {
            <div class="h-4 bg-gray-200 rounded flex-1"></div>
          }
        </div>
      }
    </div>
  `,
})
export class SkeletonLoaderComponent {
  rows = input<number[]>([1, 2, 3, 4, 5]);
  cols = input<number[]>([1, 2, 3]);
}
