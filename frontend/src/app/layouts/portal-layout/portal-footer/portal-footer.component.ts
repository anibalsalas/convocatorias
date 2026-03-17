import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-portal-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="bg-[#1F2133] text-blue-200 text-xs py-4">
      <div class="max-w-7xl mx-auto px-4 text-center">
        <p>ACFFAA — Agencia de Compras de las Fuerzas Armadas · Ministerio de Defensa del Perú</p>
        <p class="mt-1 text-blue-300/50">SISCONV v2.0 — {{ currentYear }}</p>
      </div>
    </footer>
  `,
})
export class PortalFooterComponent {
  currentYear = new Date().getFullYear();
}
