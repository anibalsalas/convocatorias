import { Component, ChangeDetectionStrategy, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

interface NavItem { label: string; icon: string; route: string; roles: string[]; }

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     icon: '📊', route: '/sistema/dashboard',       roles: [] },
  { label: 'Requerimiento', icon: '📋', route: '/sistema/requerimiento',   roles: ['ROLE_ADMIN','ROLE_ORH','ROLE_OPP','ROLE_AREA_SOLICITANTE'] },
  { label: 'Convocatoria',  icon: '📢', route: '/sistema/convocatoria',    roles: ['ROLE_ADMIN','ROLE_ORH','ROLE_COMITE'] },
  { label: 'Selección',     icon: '✅', route: '/sistema/seleccion',       roles: ['ROLE_ADMIN','ROLE_ORH','ROLE_COMITE'] },
  { label: 'Contrato',      icon: '📝', route: '/sistema/contrato',        roles: ['ROLE_ADMIN','ROLE_ORH'] },
  { label: 'Usuarios',      icon: '👥', route: '/sistema/admin/usuarios',  roles: ['ROLE_ADMIN'] },
  { label: 'Logs',          icon: '🔍', route: '/sistema/admin/logs',      roles: ['ROLE_ADMIN'] },
  { label: 'Notificaciones',icon: '🔔', route: '/sistema/notificaciones',  roles: [] },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      [class]="collapsed() ? 'w-16' : 'w-[280px]'"
      class="bg-[#1F2133] text-white flex flex-col transition-all duration-300 shadow-xl h-full">
      <!-- Logo -->
      <div class="p-4 flex items-center gap-3 border-b border-white/10">
        <div class="w-10 h-10 bg-[#D4A843] rounded-full flex items-center justify-center font-bold text-[#1F2133] text-lg shrink-0">A</div>
        @if (!collapsed()) {
          <div class="overflow-hidden">
            <div class="font-bold text-sm tracking-wide">SISCONV</div>
            <div class="text-xs text-blue-200">ACFFAA v2.0</div>
          </div>
        }
      </div>
      <!-- Nav -->
      <nav class="flex-1 py-4 space-y-1 overflow-y-auto">
        @for (item of visibleItems(); track item.route) {
          <a [routerLink]="item.route" routerLinkActive="bg-white/15 border-r-2 border-[#D4A843]"
            class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm">
            <span class="text-lg shrink-0">{{ item.icon }}</span>
            @if (!collapsed()) { <span>{{ item.label }}</span> }
          </a>
        }
      </nav>
      <!-- Toggle -->
      <button (click)="toggle.emit()" class="p-4 border-t border-white/10 hover:bg-white/10 transition text-center text-sm">
        {{ collapsed() ? '→' : '← Colapsar' }}
      </button>
    </aside>
  `,
})
export class SidebarComponent {
  private auth = inject(AuthService);
  collapsed = input<boolean>(false);
  toggle = output<void>();

  visibleItems(): NavItem[] {
    return NAV_ITEMS.filter(item =>
      item.roles.length === 0 || this.auth.hasAnyRole(item.roles)
    );
  }
}
