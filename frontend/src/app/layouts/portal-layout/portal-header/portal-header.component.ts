import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-portal-header',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bg-[#1F2133] text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <a routerLink="/portal/convocatorias" class="flex items-center gap-3 hover:opacity-90 transition">
            
          <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-[#D4A843]/30">
            <img 
              src="/images/logo.png" 
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
  `,
})
export class PortalHeaderComponent {
  auth = inject(AuthService);
}
