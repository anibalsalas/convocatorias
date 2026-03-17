import { Routes } from '@angular/router';

/**
 * E2 — Rutas del módulo M01 Requerimiento (PKG-01)
 * Lazy-loaded desde app.routes.ts: /sistema/requerimiento/**
 * Endpoints consumidos: E1-E8
 */
export const requerimientoRoutes: Routes = [
  // === Perfiles de Puesto (E1-E5) ===
  {
    path: 'perfiles',
    loadComponent: () => import('./pages/perfil-list/perfil-list.component').then(m => m.PerfilListComponent),
  },
  {
    path: 'perfil/nuevo',
    loadComponent: () => import('./pages/perfil-form/perfil-form.component').then(m => m.PerfilFormComponent),
  },
  {
    path: 'perfil/:id',
    loadComponent: () => import('./pages/perfil-form/perfil-form.component').then(m => m.PerfilFormComponent),
  },
  {
    path: 'perfil/:id/validar',
    loadComponent: () => import('./pages/perfil-validar/perfil-validar.component').then(m => m.PerfilValidarComponent),
  },
  {
    path: 'perfil/:id/pdf',
    loadComponent: () => import('./pages/perfil-pdf/perfil-pdf.component').then(m => m.PerfilPdfComponent),
  },

  // === Requerimientos (E6-E8) ===
  {
    path: 'requerimientos',
    loadComponent: () => import('./pages/requerimiento-list/requerimiento-list.component').then(m => m.RequerimientoListComponent),
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/requerimiento-form/requerimiento-form.component').then(m => m.RequerimientoFormComponent),
  },
  {
    path: ':id/presupuesto',
    loadComponent: () => import('./pages/presupuesto-form/presupuesto-form.component').then(m => m.PresupuestoFormComponent),
  },
  {
    path: ':id/reglas',
    loadComponent: () => import('./pages/motor-reglas/motor-reglas.component').then(m => m.MotorReglasComponent),
  },

  // Default
  { path: '', redirectTo: 'perfiles', pathMatch: 'full' },
];
