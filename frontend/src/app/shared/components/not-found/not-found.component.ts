import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
      <div class="text-8xl font-bold text-gray-200 mb-4">404</div>
      <h1 class="text-2xl font-bold text-gray-700 mb-2">Página no encontrada</h1>
      <p class="text-gray-500 mb-6">La ruta solicitada no existe en SISCONV.</p>
      <a routerLink="/" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 text-sm">
        Ir al inicio
      </a>
    </div>
  `,
})
export class NotFoundComponent {}
