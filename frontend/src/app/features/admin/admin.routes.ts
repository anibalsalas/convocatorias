import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';

export const adminRoutes: Routes = [
  {
    path: 'usuarios',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN'] },
    loadComponent: () =>
      import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
  },
  {
    path: 'areas',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN'] },
    loadComponent: () =>
      import('./pages/areas/areas.component').then((m) => m.AreasComponent),
  },
  {
    path: 'logs',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN'] },
    loadComponent: () =>
      import('./pages/log-transparencia/log-transparencia.component').then(
        (m) => m.LogTransparenciaComponent,
      ),
  },
  { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
];
