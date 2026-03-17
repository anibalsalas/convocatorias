import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/services/toast.service';

interface NavItem { label: string; icon: string; route: string; roles: string[]; }

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     icon: '📊', route: '/sistema/dashboard',       roles: [] },
  { label: 'Perfiles de Puesto', icon: '📋', route: '/sistema/requerimiento',   roles: ['ROLE_ADMIN','ROLE_ORH','ROLE_OPP','ROLE_AREA_SOLICITANTE'] },
  { label: 'Requerimientos de Personal', icon: '📋', route: '/sistema/requerimiento/requerimientos',   roles: ['ROLE_ADMIN','ROLE_ORH','ROLE_OPP', 'ROLE_AREA_SOLICITANTE'] },
  { label: 'Convocatoria',  icon: '📢', route: '/sistema/convocatoria',    roles: ['ROLE_ADMIN','ROLE_ORH','ROLE_COMITE'] },
  { label: 'Selección',     icon: '✅', route: '/sistema/seleccion',       roles: ['ROLE_ADMIN','ROLE_ORH','ROLE_COMITE'] },
  { label: 'Contrato',      icon: '📝', route: '/sistema/contrato',        roles: ['ROLE_ADMIN','ROLE_ORH'] },
  { label: 'Usuarios',      icon: '👥', route: '/sistema/admin/usuarios',  roles: ['ROLE_ADMIN'] },
  { label: 'Logs',          icon: '🔍', route: '/sistema/admin/logs',      roles: ['ROLE_ADMIN'] },
  { label: 'Notificaciones',icon: '🔔', route: '/sistema/notificaciones',  roles: [] },
];

@Component({
  selector: 'app-sistema-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen bg-gray-50">
      <!-- Sidebar -->
      <aside
        [class]="collapsed() ? 'w-16' : 'w-[280px]'"
        class="bg-[#1F2133] text-white flex flex-col transition-all duration-300 shadow-xl">
        <!-- Logo -->
        <div class="p-3 flex items-center gap-2 border-b border-white/10">
        <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-[#D4A843]/30">
            <img 
              src="/assets/images/logo.png" 
              alt="Logo ACFFAA" 
              class="w-full h-full object-cover"
            />
          </div>

          @if (!collapsed()) {
            <div class="overflow-hidden">
              <div class="font-bold text-sm tracking-wide text-white">SISCONV</div>
              <div class="text-xs text-blue-200">ACFFAA v1.0</div>
            </div>
          }
        </div>
        <!-- Nav -->
        <nav class="flex-1 py-3 space-y-0.5 overflow-y-auto">
          @for (item of visibleItems(); track item.route) {
            <a [routerLink]="item.route" routerLinkActive="bg-white/15 border-r-2 border-[#D4A843]"
              class="flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors text-sm">
              <span class="text-lg shrink-0">{{ item.icon }}</span>
              @if (!collapsed()) { <span>{{ item.label }}</span> }
            </a>
          }
        </nav>
        <!-- Collapse toggle -->
        <button (click)="collapsed.set(!collapsed())" class="p-3 border-t border-white/10 hover:bg-white/10 transition text-center text-sm">
          {{ collapsed() ? '→' : '← Colapsar' }}
        </button>
      </aside>

      <!-- Main -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <header class="h-11 bg-white border-b flex items-center justify-between px-4 shadow-sm">
          <div class="text-sm text-gray-500">Sistema de Convocatorias CAS</div>
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium text-gray-700">{{ auth.currentUser()?.nombreCompleto }}</span>
            <button (click)="auth.logout()" class="text-sm text-gray-500 hover:text-red-500 transition">
              Salir
            </button>
          </div>
        </header>
        <!-- Content -->
        <main class="flex-1 overflow-y-auto p-4">
          <router-outlet />
        </main>
      </div>

      <!-- Toasts -->
      <div class="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        @for (toast of toastService.toasts(); track toast.id) {
          <div [class]="'px-4 py-3 rounded-lg shadow-lg text-sm font-medium ' +
            (toast.type === 'success' ? 'bg-green-600 text-white' :
             toast.type === 'error' ? 'bg-red-600 text-white' :
             toast.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-blue-600 text-white')"
            (click)="toastService.dismiss(toast.id)">
            {{ toast.message }}
          </div>
        }
      </div>
    </div>
  `,
})
export class SistemaLayoutComponent {
  auth = inject(AuthService);
  toastService = inject(ToastService);
  collapsed = signal(false);

  visibleItems(): NavItem[] {
    return NAV_ITEMS.filter(item =>
      item.roles.length === 0 || this.auth.hasAnyRole(item.roles)
    );
  }
}
