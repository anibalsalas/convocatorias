import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { SistemaPendingExitService } from '@core/services/sistema-pending-exit.service';
import { ToastService } from '@core/services/toast.service';

interface NavItem { label: string; iconKey: string; route: string; roles: string[]; }

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',                 iconKey: 'dashboard',      route: '/sistema/dashboard',                    roles: [] },
  { label: 'Perfiles de Puesto',         iconKey: 'requerimiento',  route: '/sistema/requerimiento',                roles: ['ROLE_ADMIN','ROLE_ORH','ROLE_OPP','ROLE_AREA_SOLICITANTE'] },
  { label: 'Requerimientos',             iconKey: 'requerimiento',  route: '/sistema/requerimiento/requerimientos', roles: ['ROLE_ADMIN','ROLE_ORH','ROLE_OPP','ROLE_AREA_SOLICITANTE'] },
  { label: 'Convocatoria',               iconKey: 'convocatoria',   route: '/sistema/convocatoria',                 roles: ['ROLE_ADMIN','ROLE_ORH','ROLE_COMITE'] },
  { label: 'Selección',                  iconKey: 'seleccion',      route: '/sistema/seleccion',                    roles: ['ROLE_ADMIN','ROLE_ORH','ROLE_COMITE'] },
  { label: 'Contrato',                   iconKey: 'contrato',       route: '/sistema/contrato',                     roles: ['ROLE_ADMIN','ROLE_ORH'] },
  { label: 'Usuarios',                   iconKey: 'usuarios',       route: '/sistema/admin/usuarios',               roles: ['ROLE_ADMIN'] },
  { label: 'Logs',                       iconKey: 'logs',           route: '/sistema/admin/logs',                   roles: ['ROLE_ADMIN'] },
  { label: 'Notificaciones',             iconKey: 'notificaciones', route: '/sistema/notificaciones',               roles: [] },
];

const ICON_PATHS: Record<string, string> = {
  dashboard:      'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  requerimiento:  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  convocatoria:   'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  seleccion:      'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  contrato:       'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  notificaciones: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  usuarios:       'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  logs:           'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
};

@Component({
  selector: 'app-sistema-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen bg-gray-50">

      <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
      <aside [class]="collapsed() ? 'w-16' : 'w-[260px]'"
             class="bg-[#1F2133] text-white flex flex-col transition-all duration-300 shadow-xl shrink-0">

        <!-- Logo -->
        <div class="p-3 flex items-center gap-3 border-b border-white/10 h-14 shrink-0">
          <img src="/assets/images/logo.png" alt="ACFFAA"
               class="w-9 h-9 rounded-full border border-[#D4A843]/50 object-cover shrink-0">
          @if (!collapsed()) {
            <div class="overflow-hidden">
              <div class="font-bold text-sm tracking-wide text-white leading-none">SISCONV</div>
              <div class="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">ACFFAA v2.0</div>
            </div>
          }
        </div>

        <!-- Nav -->
        <nav class="flex-1 py-2 overflow-y-auto">
          @for (item of visibleItems(); track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="bg-white/15 border-l-2 border-[#D4A843]"
               class="flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 transition-colors text-sm group"
               [title]="collapsed() ? item.label : ''">
              <svg class="w-5 h-5 shrink-0 text-white/70 group-hover:text-white transition-colors"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                      [attr.d]="iconPath(item.iconKey)"/>
              </svg>
              @if (!collapsed()) {
                <span class="truncate text-white/85 group-hover:text-white transition-colors">
                  {{ item.label }}
                </span>
              }
            </a>
          }
        </nav>

        <!-- Toggle colapsar -->
        <button (click)="collapsed.set(!collapsed())"
                class="h-11 border-t border-white/10 hover:bg-white/10 transition flex items-center justify-center shrink-0"
                [title]="collapsed() ? 'Expandir menú' : 'Colapsar menú'">
          <svg class="w-4 h-4 text-white/40 transition-transform duration-300"
               [class.rotate-180]="!collapsed()"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </aside>

      <!-- ── Main ───────────────────────────────────────────────────────── -->
      <div class="flex-1 flex flex-col overflow-hidden min-w-0">

        <!-- Header -->
        <header class="h-14 bg-white border-b flex items-center justify-between px-5 shadow-sm shrink-0">
          <!-- Izquierda: identidad -->
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs font-bold text-[#1F2133] tracking-wide uppercase">SISCONV</span>
            <span class="text-gray-200 font-thin text-lg leading-none">|</span>
            <span class="text-xs text-gray-400 truncate hidden sm:block">
              Sistema de Convocatorias CAS
            </span>
          </div>
          <!-- Derecha: usuario + salir -->
          <div class="flex items-center gap-3 shrink-0">
            <!-- Avatar con iniciales -->
            <div class="w-8 h-8 rounded-full bg-[#1F2133] flex items-center justify-center
                        text-white text-xs font-bold shrink-0 select-none">
              {{ initials() }}
            </div>
            <!-- Nombre + rol -->
            <div class="hidden sm:block leading-none min-w-0">
              <div class="text-sm font-medium text-gray-800 truncate max-w-[160px]">
                {{ auth.currentUser()?.nombreCompleto }}
              </div>
              <div class="text-[10px] text-gray-400 mt-0.5">{{ roleLabel() }}</div>
            </div>
            <!-- Botón salir -->
            <button (click)="onSalir()"
                    class="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500
                           hover:bg-red-50 px-2 py-1.5 rounded transition-colors ml-1"
                    title="Cerrar sesión">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span class="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <!-- Contenido -->
        <main class="flex-1 overflow-y-auto p-4">
          <router-outlet />
        </main>
      </div>

      <!-- ── Toasts ──────────────────────────────────────────────────────── -->
      <div class="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        @for (toast of toastService.toasts(); track toast.id) {
          <div (click)="toastService.dismiss(toast.id)"
               [class]="'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer ' +
                 (toast.type === 'success' ? 'bg-green-600 text-white' :
                  toast.type === 'error'   ? 'bg-red-600 text-white'   :
                  toast.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-blue-600 text-white')">
            <span class="shrink-0 text-base leading-none">
              {{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : toast.type === 'warning' ? '⚠' : 'ℹ' }}
            </span>
            <span>{{ toast.message }}</span>
          </div>
        }
      </div>

    </div>
  `,
})
export class SistemaLayoutComponent {
  readonly auth         = inject(AuthService);
  readonly toastService = inject(ToastService);
  private readonly pendingExit = inject(SistemaPendingExitService);
  readonly collapsed    = signal(false);

  onSalir(): void {
    this.pendingExit.attemptExit(() => this.auth.logout());
  }

  readonly initials = computed(() => {
    const nombre = this.auth.currentUser()?.nombreCompleto ?? '';
    return nombre.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U';
  });

  readonly roleLabel = computed(() => {
    if (this.auth.hasAnyRole(['ROLE_ADMIN']))           return 'Administrador';
    if (this.auth.hasAnyRole(['ROLE_ORH']))             return 'Of. Rec. Humanos';
    if (this.auth.hasAnyRole(['ROLE_OPP']))             return 'Of. de Planeamiento';
    if (this.auth.hasAnyRole(['ROLE_AREA_SOLICITANTE'])) return 'Área Solicitante';
    if (this.auth.hasAnyRole(['ROLE_COMITE']))          return 'Comité de Selección';
    if (this.auth.hasAnyRole(['ROLE_OI']))              return 'Órgano de Inspección';
    if (this.auth.hasAnyRole(['ROLE_POSTULANTE']))      return 'Postulante';
    return '';
  });

  iconPath(key: string): string { return ICON_PATHS[key] ?? ''; }

  visibleItems(): NavItem[] {
    return NAV_ITEMS.filter(item =>
      item.roles.length === 0 || this.auth.hasAnyRole(item.roles)
    );
  }
}
