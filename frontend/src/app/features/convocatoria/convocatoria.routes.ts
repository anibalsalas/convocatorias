import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';

/**
 * E3 — Rutas del módulo M02 Convocatoria (PKG-02).
 * Roles alineados al backend real (D2).
 * D1 aplicado para E3 interno: bases-pdf se mantiene alineado al backend real (ADMIN/ORH).
 * La exposición pública sin auth queda como evolución posterior mediante endpoint público separado.
 */
export const convocatoriaRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH', 'ROLE_COMITE'] },
    loadComponent: () => import('./pages/convocatoria-list/convocatoria-list.component').then(m => m.ConvocatoriaListComponent),
  },
  {
    path: 'nueva',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () => import('./pages/convocatoria-form/convocatoria-form.component').then(m => m.ConvocatoriaFormComponent),
  },
  {
    path: ':id/cronograma',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () => import('./pages/cronograma/cronograma.component').then(m => m.CronogramaComponent),
  },
  {
    path: ':id/comite',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () => import('./pages/comite/comite.component').then(m => m.ComiteComponent),
  },
  {
    path: ':id/factores',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_COMITE'] },
    loadComponent: () => import('./pages/factores/factores.component').then(m => m.FactoresComponent),
  },
  {
    path: ':id/acta',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_COMITE'] },
    loadComponent: () => import('./pages/acta/acta.component').then(m => m.ActaComponent),
  },
  {
    path: ':id/publicar',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () => import('./pages/publicar/publicar.component').then(m => m.PublicarComponent),
  },
  {
    // E16 interno M02: Bases PDF solo para ADMIN y ORH, alineado al backend real.
    path: ':id/bases',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () => import('./pages/bases-pdf/bases-pdf.component').then(m => m.BasesPdfComponent),
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
