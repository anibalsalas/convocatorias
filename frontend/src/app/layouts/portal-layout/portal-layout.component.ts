import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <!-- Header institucional -->
      <header class="bg-[#1F2133] text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <a routerLink="/portal/convocatorias" class="flex items-center gap-3 hover:opacity-90 transition">
              
          <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-[#D4A843]/30">
            <img 
              src="/assets/images/logo.png" 
              alt="Logo ACFFAA" 
              class="w-full h-full object-cover"
            />
          </div>

              <div>
                <div class="font-bold text-sm tracking-wide">SISCONV-ACFFAA</div>
                <div class="text-xs text-blue-200 hidden sm:block">Sistema de Convocatorias CAS</div>
              </div>
            </a>
            <nav class="flex items-center gap-4">
              @if (auth.isAuthenticated()) {
                <span class="text-sm text-blue-200 hidden md:block">{{ auth.currentUser()?.nombreCompleto }}</span>
                <button (click)="auth.logout()" class="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition">
                  Cerrar sesión
                </button>
              } @else {
                <a routerLink="/portal/login" class="text-sm bg-[#D4A843] hover:bg-[#E0BE6A] text-[#1F2133] font-semibold px-4 py-1.5 rounded-md transition">
                  Iniciar sesión
                </a>
              }
            </nav>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 flex flex-col min-h-0">
        <router-outlet />
      </main>

      <!-- Toast container -->
      <div class="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        @for (toast of toastService.toasts(); track toast.id) {
          <div
            [class]="'px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in ' + toastClass(toast.type)"
            (click)="toastService.dismiss(toast.id)">
            {{ toast.message }}
          </div>
        }
      </div>

      <!-- Footer -->
      <footer class="bg-[#1F2133] text-blue-200 text-xs py-4">
        <div class="max-w-7xl mx-auto px-4 text-center">
          ACFFAA — Agencia de Compras de las Fuerzas Armadas · Ministerio de Defensa del Perú
        </div>
      </footer>
    </div>
  `,
})
export class PortalLayoutComponent {
  auth = inject(AuthService);
  toastService = inject(ToastService);

  toastClass(type: string): string {
    const map: Record<string, string> = {
      success: 'bg-green-600 text-white',
      error: 'bg-red-600 text-white',
      warning: 'bg-yellow-500 text-white',
      info: 'bg-blue-600 text-white',
    };
    return map[type] ?? 'bg-gray-600 text-white';
  }
}
