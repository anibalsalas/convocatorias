import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-seleccion-list',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Selección CAS" subtitle="Evaluación y selección de postulantes">
      <a routerLink="/sistema/dashboard" class="btn-ghost">← Volver</a>
    </app-page-header>
    <div class="card p-8 text-center text-gray-500">
      <p class="text-lg mb-2">Acceda a las convocatorias para gestionar el proceso de selección.</p>
      <a routerLink="/sistema/convocatoria" class="btn-primary inline-block mt-4">Ir a Convocatorias</a>
    </div>
  `,
})
export class SeleccionListComponent {}
