import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';

/**
 * Breadcrumb contextual integrado en el layout del sistema
 * Se alimenta dinámicamente según la ruta activa (implementación completa en E2)
 */
@Component({
  selector: 'app-layout-breadcrumb',
  standalone: true,
  imports: [BreadcrumbComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-breadcrumb [items]="[{label: 'Inicio', route: '/sistema/dashboard'}, {label: 'Dashboard'}]" />`,
})
export class LayoutBreadcrumbComponent {}
