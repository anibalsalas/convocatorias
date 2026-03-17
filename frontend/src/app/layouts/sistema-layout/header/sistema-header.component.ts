import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-sistema-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="h-14 bg-white border-b flex items-center justify-between px-6 shadow-sm">
      <div class="text-sm text-gray-500">Sistema de Convocatorias CAS</div>
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium text-gray-700">{{ auth.currentUser()?.nombreCompleto }}</span>
        <button (click)="auth.logout()" class="text-sm text-gray-500 hover:text-red-500 transition">
          Salir
        </button>
      </div>
    </header>
  `,
})
export class SistemaHeaderComponent {
  auth = inject(AuthService);
}
