import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly count = signal(0);
  readonly isLoading = computed(() => this.count() > 0);

  show(): void { this.count.update(c => c + 1); }
  hide(): void { this.count.update(c => Math.max(0, c - 1)); }
}
