import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-sistema-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .dashboard-bg {
      background-image: url('/assets/images/fondo.jpeg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      margin: -1rem;
      padding: 5rem;
      min-height: calc(100vh - 2.75rem);
    }
  `],
  template: `
    <div class="dashboard-bg">
      <h1 class="text-xl font-bold text-gray-800 mb-1"></h1>
     
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card"><div class="text-2xl mb-1">📋</div><h3 class="font-bold text-sm">Requerimientos</h3><p class="text-xs text-gray-500"></p></div>
        <div class="card"><div class="text-2xl mb-1">📢</div><h3 class="font-bold text-sm">Convocatorias</h3><p class="text-xs text-gray-500"></p></div>
        <div class="card"><div class="text-2xl mb-1">✅</div><h3 class="font-bold text-sm">Selección</h3><p class="text-xs text-gray-500"></p></div>
        <div class="card"><div class="text-2xl mb-1">📝</div><h3 class="font-bold text-sm">Contratos</h3><p class="text-xs text-gray-500"></p></div>
      </div>
    </div>
  `,
})
export class SistemaDashboardComponent {
  auth = inject(AuthService);
}
