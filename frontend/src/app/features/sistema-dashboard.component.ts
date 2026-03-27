import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-sistema-dashboard',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Hero Banner: gradiente CSS puro — sin imagen externa -->
    <div class="relative h-52 rounded-xl overflow-hidden mb-6 shadow-lg
                bg-gradient-to-r from-[#1F2133] via-[#243050] to-[#2D5F8A]">
      <!-- Contenido institucional -->
      <div class="h-full flex items-center px-8">
        <div class="flex items-center gap-5">
          <img src="/assets/images/logo.png" alt="ACFFAA"
               class="w-14 h-14 rounded-full border-2 border-[#D4A843]/70 object-cover shadow-lg shrink-0">
          <div>
            <p class="text-[#D4A843] text-xs font-semibold uppercase tracking-widest mb-1">
              ACFFAA · Régimen CAS
            </p>
            <h1 class="text-white font-bold text-2xl leading-tight">
              {{ greeting() }}, {{ firstName() }}
            </h1>
            <p class="text-white/55 text-sm mt-1">
              Sistema de Convocatorias a Puestos Laborales
            </p>
          </div>
        </div>
      </div>
      <!-- Franja dorada institucional inferior -->
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-[#D4A843]"></div>
      <!-- Detalle decorativo derecho -->
      <div class="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#D4A843]/10 to-transparent pointer-events-none"></div>
    </div>

    <!-- Acceso rápido por módulo -->
    <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-0.5">
      Acceso rápido
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

      @if (canRequerimiento()) {
        <a routerLink="/sistema/requerimiento"
           class="card group flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 hover:border-[#D4A843]/50 transition-all duration-200 cursor-pointer">
          <div class="w-10 h-10 bg-[#1F2133]/8 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-[#1F2133]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-sm text-gray-800">Requerimientos</h3>
            <p class="text-xs text-gray-500 mt-0.5">Perfiles y requerimientos CAS</p>
          </div>
          <span class="text-xs text-[#1F2133] font-medium mt-auto group-hover:text-[#D4A843] transition-colors">
            Ir al módulo →
          </span>
        </a>
      }

      @if (canConvocatoria()) {
        <a routerLink="/sistema/convocatoria"
           class="card group flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 hover:border-[#D4A843]/50 transition-all duration-200 cursor-pointer">
          <div class="w-10 h-10 bg-[#1F2133]/8 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-[#1F2133]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-sm text-gray-800">Convocatorias</h3>
            <p class="text-xs text-gray-500 mt-0.5">Gestión de convocatorias CAS</p>
          </div>
          <span class="text-xs text-[#1F2133] font-medium mt-auto group-hover:text-[#D4A843] transition-colors">
            Ir al módulo →
          </span>
        </a>
      }

      @if (canSeleccion()) {
        <a routerLink="/sistema/seleccion"
           class="card group flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 hover:border-[#D4A843]/50 transition-all duration-200 cursor-pointer">
          <div class="w-10 h-10 bg-[#1F2133]/8 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-[#1F2133]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-sm text-gray-800">Selección</h3>
            <p class="text-xs text-gray-500 mt-0.5">Evaluación y selección de postulantes</p>
          </div>
          <span class="text-xs text-[#1F2133] font-medium mt-auto group-hover:text-[#D4A843] transition-colors">
            Ir al módulo →
          </span>
        </a>
      }

      @if (canContrato()) {
        <a routerLink="/sistema/contrato"
           class="card group flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 hover:border-[#D4A843]/50 transition-all duration-200 cursor-pointer">
          <div class="w-10 h-10 bg-[#1F2133]/8 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-[#1F2133]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-sm text-gray-800">Contratos</h3>
            <p class="text-xs text-gray-500 mt-0.5">Gestión de contratos CAS</p>
          </div>
          <span class="text-xs text-[#1F2133] font-medium mt-auto group-hover:text-[#D4A843] transition-colors">
            Ir al módulo →
          </span>
        </a>
      }

    </div>
  `,
})
export class SistemaDashboardComponent {
  readonly auth = inject(AuthService);

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });

  readonly firstName = computed(() => {
    const nombre = this.auth.currentUser()?.nombreCompleto ?? 'Usuario';
    return nombre.split(' ')[0];
  });

  readonly canRequerimiento = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH', 'ROLE_OPP', 'ROLE_AREA_SOLICITANTE']));
  readonly canConvocatoria = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH', 'ROLE_COMITE']));
  readonly canSeleccion = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH', 'ROLE_COMITE']));
  readonly canContrato = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH']));
}
