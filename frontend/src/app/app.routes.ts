import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'portal',
    loadComponent: () => import('@layouts/portal-layout/portal-layout.component').then(m => m.PortalLayoutComponent),
    children: [
      { path: 'convocatorias', loadComponent: () => import('@portal/convocatorias-publicas/convocatorias-publicas.component').then(m => m.ConvocatoriasPublicasComponent) },
      { path: 'login', loadComponent: () => import('@portal/login/login.component').then(m => m.LoginComponent) },
      { path: 'registro', loadComponent: () => import('@portal/registro/registro.component').then(m => m.RegistroComponent) },
      {
        path: 'dashboard',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () => import('@portal/portal-dashboard.component').then(m => m.PortalDashboardComponent),
      },
      {
        path: 'convocatorias-vigentes',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () => import('@portal/convocatorias-vigentes/convocatorias-vigentes.component').then(m => m.ConvocatoriasVigentesComponent),
      },
      {
        path: 'mi-perfil',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () => import('@portal/mi-perfil/mi-perfil.component').then(m => m.MiPerfilComponent),
      },
      {
        path: 'postulaciones',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () => import('@portal/mis-postulaciones/mis-postulaciones.component').then(m => m.MisPostulacionesComponent),
      },
      {
        path: 'expediente/:idPost',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () =>
          import('@portal/expediente/expediente.component').then(
            (m) => m.ExpedienteComponent,
          ),
      },
      { path: '', redirectTo: 'convocatorias', pathMatch: 'full' },
    ],
  },

  {
    path: 'sistema',
    canActivate: [authGuard],
    loadComponent: () => import('@layouts/sistema-layout/sistema-layout.component').then(m => m.SistemaLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('@features/sistema-dashboard.component').then(m => m.SistemaDashboardComponent),
      },
      {
        path: 'requerimiento',
        loadChildren: () => import('@features/requerimiento/requerimiento.routes').then(m => m.requerimientoRoutes),
      },
      {
        path: 'convocatoria',
        loadChildren: () => import('@features/convocatoria/convocatoria.routes').then(m => m.convocatoriaRoutes),
      },
      {
        path: 'notificaciones',
        loadComponent: () => import('@features/notificaciones/pages/notificacion-list/notificacion-list.component').then(m => m.NotificacionListComponent),
      },
      {
        path: 'seleccion',
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_ORH', 'ROLE_COMITE'] },
        loadComponent: () => import('@features/seleccion/pages/seleccion-list/seleccion-list.component').then(m => m.SeleccionListComponent),
      },
      {
        path: 'contrato',
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
        loadComponent: () => import('@features/contrato/pages/contrato-list/contrato-list.component').then(m => m.ContratoListComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  { path: '', redirectTo: 'portal/convocatorias', pathMatch: 'full' },
  { path: '**', redirectTo: 'portal/convocatorias' },
];