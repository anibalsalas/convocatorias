import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * DataTable genérico con paginación server-side, sort y filtros
 * Consume Page<T> del backend (Pageable Spring)
 * Directriz: Paginación obligatoria, prohibido findAll()
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-lg shadow border overflow-hidden">
      <!-- Header con búsqueda -->
      @if (showSearch()) {
        <div class="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
          <input
            type="text"
            [placeholder]="searchPlaceholder()"
            class="input-field max-w-xs"
            [ngModel]="searchTerm()"
            (ngModelChange)="onSearch($event)" />
          <span class="text-xs text-gray-500">
            {{ totalElements() }} registro(s)
          </span>
        </div>
      }

      <!-- Table content (projected) -->
      <div class="overflow-x-auto">
        <ng-content />
      </div>

      <!-- Pagination -->
      @if (totalPages() > 1) {
        <div class="px-3 py-2 border-t bg-gray-50 flex items-center justify-between text-xs">
          <span class="text-gray-500">
            Página {{ currentPage() + 1 }} de {{ totalPages() }} · {{ totalElements() }} registros
          </span>
          <div class="flex gap-1">
            <button
              (click)="onPageChange(currentPage() - 1)"
              [disabled]="currentPage() === 0"
              class="px-2 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-40 transition">
              ← Anterior
            </button>
            <button
              (click)="onPageChange(currentPage() + 1)"
              [disabled]="currentPage() >= totalPages() - 1"
              class="px-2 py-1 border rounded text-xs hover:bg-gray-100 disabled:opacity-40 transition">
              Siguiente →
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DataTableComponent {
  totalElements = input<number>(0);
  totalPages = input<number>(0);
  currentPage = input<number>(0);
  showSearch = input<boolean>(true);
  searchPlaceholder = input<string>('Buscar...');

  pageChange = output<number>();
  search = output<string>();

  searchTerm = signal('');

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.search.emit(term);
  }
}
