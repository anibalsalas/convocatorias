import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-contrato-list',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Contratos CAS" subtitle="Gestión de contratos de personal">
      <a routerLink="/sistema/dashboard" class="btn-ghost">← Volver</a>
    </app-page-header>
    <div class="card p-8 text-center text-gray-500">
      <p class="text-lg mb-2">Módulo de contratos en desarrollo.</p>
      <a routerLink="/sistema/dashboard" class="btn-primary inline-block mt-4">Volver al Dashboard</a>
    </div>
  `,
})
export class ContratoListComponent {}
