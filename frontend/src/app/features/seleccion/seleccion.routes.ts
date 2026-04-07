import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';

/**
 * E4 — Rutas del módulo M03 Selección (PKG-03).
 * Roles alineados al backend real por endpoint.
 * CORREGIDO: añadidas rutas filtro (E20) y tachas (E22).
 */
export const seleccionRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH', 'ROLE_COMITE'] },
    loadComponent: () =>
      import('./pages/seleccion-list/seleccion-list.component').then(
        (m) => m.SeleccionListComponent,
      ),
  },
  {
    path: ':id/postulantes',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH', 'ROLE_COMITE'] },
    loadComponent: () =>
      import('./pages/postulantes/postulantes.component').then(
        (m) => m.PostulantesComponent,
      ),
  },
  {
    path: ':id/filtro',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/filtro/filtro.component').then(
        (m) => m.FiltroRequisitosComponent,
      ),
  },
  {
    path: ':id/dl1451/:idPost',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/dl1451/dl1451.component').then((m) => m.Dl1451Component),
  },
  {
    path: ':id/tachas',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/tacha-resolver/tacha-resolver.component').then(
        (m) => m.TachaResolverComponent,
      ),
  },
  {
    path: ':id/eval-curricular',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_COMITE', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/eval-curricular/eval-curricular.component').then(
        (m) => m.EvalCurricularComponent,
      ),
  },
  {
    path: ':id/codigos-anonimos',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/codigos-anonimos/codigos-anonimos.component').then(
        (m) => m.CodigosAnonimosComponent,
      ),
  },
  {
    path: ':id/eval-tecnica',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_COMITE', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/eval-tecnica/eval-tecnica.component').then(
        (m) => m.EvalTecnicaComponent,
      ),
  },
  // V34 — Examen Técnico Virtual
  {
    path: ':id/banco-preguntas',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_AREA_SOLICITANTE'] },
    loadComponent: () =>
      import('./pages/banco-preguntas/banco-preguntas.component').then(
        (m) => m.BancoPreguntasComponent,
      ),
  },
  {
    path: ':id/config-examen',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/config-examen/config-examen.component').then(
        (m) => m.ConfigExamenComponent,
      ),
  },
  {
    path: ':id/examen-virtual/:idPost',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_POSTULANTE'] },
    loadComponent: () =>
      import('./pages/examen-virtual/examen-virtual.component').then(
        (m) => m.ExamenVirtualComponent,
      ),
  },
  {
    path: ':id/examen-resultados',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/examen-resultados/examen-resultados.component').then(
        (m) => m.ExamenResultadosComponent,
      ),
  },
  {
    path: ':id/entrevista',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_COMITE', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/entrevista/entrevista.component').then(
        (m) => m.EntrevistaComponent,
      ),
  },
  {
    path: ':id/bonificaciones',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/bonificaciones/bonificaciones.component').then(
        (m) => m.BonificacionesComponent,
      ),
  },
  {
    path: ':id/cuadro-meritos',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/cuadro-meritos/cuadro-meritos.component').then(
        (m) => m.CuadroMeritosComponent,
      ),
  },
  {
    path: ':id/publicar',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
    loadComponent: () =>
      import('./pages/publicar/publicar.component').then(
        (m) => m.PublicarSeleccionComponent,
      ),
  },
  {
    path: ':id/comunicados',
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_ORH', 'ROLE_COMITE'] },
    loadComponent: () =>
      import('./pages/comunicados/comunicados.component').then(
        (m) => m.ComunicadosComponent,
      ),
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
