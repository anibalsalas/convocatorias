import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'portal',
    loadComponent: () =>
      import('@layouts/portal-layout/portal-layout.component').then(
        (m) => m.PortalLayoutComponent,
      ),
    children: [
      {
        path: 'convocatorias',
        loadComponent: () =>
          import('@portal/convocatorias-publicas/convocatorias-publicas.component').then(
            (m) => m.ConvocatoriasPublicasComponent,
          ),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('@portal/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'registro',
        loadComponent: () =>
          import('@portal/registro/registro.component').then((m) => m.RegistroComponent),
      },
      {
        path: 'recuperar-contrasena',
        loadComponent: () =>
          import('@portal/recuperar-contrasena/recuperar-contrasena.component').then(
            (m) => m.RecuperarContrasenaComponent,
          ),
      },
      {
        path: 'dashboard',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () =>
          import('@portal/portal-dashboard.component').then((m) => m.PortalDashboardComponent),
      },
      {
        path: 'convocatorias-vigentes',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () =>
          import('@portal/convocatorias-vigentes/convocatorias-vigentes.component').then(
            (m) => m.ConvocatoriasVigentesComponent,
          ),
      },
      {
        path: 'mi-perfil',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () =>
          import('@portal/mi-perfil/mi-perfil.component').then((m) => m.MiPerfilComponent),
      },
      // ── M03-POST: Wizard 4 pasos — E17 ──────────────────────────────────
      {
        path: 'postular/:idConv',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () =>
          import('@portal/postular/postular.component').then((m) => m.PostularComponent),
      },
      {
        path: 'postulaciones',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () =>
          import('@portal/mis-postulaciones/mis-postulaciones.component').then(
            (m) => m.MisPostulacionesComponent,
          ),
      },
      {
        path: 'expediente/:idPost',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () =>
          import('@portal/expediente/expediente.component').then((m) => m.ExpedienteComponent),
      },
      // ── M03-TACHA-P: Registrar tacha — E21 ──────────────────────────────
      {
        path: 'tachas/:idConv',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () =>
          import('@portal/tacha/registrar-tacha.component').then(
            (m) => m.RegistrarTachaComponent,
          ),
      },
      {
        path: 'resultados',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () =>
          import('@portal/mis-resultados/mis-resultados.component').then(
            (m) => m.MisResultadosComponent,
          ),
      },
      // ── V34: Examen Técnico Virtual — Postulante ────────────────────────
      {
        path: 'examen/:id/:idPost',
        canActivate: [authGuard],
        data: { roles: ['ROLE_POSTULANTE'] },
        loadComponent: () =>
          import('@features/seleccion/pages/examen-virtual/examen-virtual.component').then(
            (m) => m.ExamenVirtualComponent,
          ),
      },
      { path: '', redirectTo: 'convocatorias', pathMatch: 'full' },
    ],
  },

  {
    path: 'sistema',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@layouts/sistema-layout/sistema-layout.component').then(
        (m) => m.SistemaLayoutComponent,
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@features/sistema-dashboard.component').then(
            (m) => m.SistemaDashboardComponent,
          ),
      },
      {
        path: 'requerimiento',
        loadChildren: () =>
          import('@features/requerimiento/requerimiento.routes').then(
            (m) => m.requerimientoRoutes,
          ),
      },
      {
        path: 'convocatoria',
        loadChildren: () =>
          import('@features/convocatoria/convocatoria.routes').then((m) => m.convocatoriaRoutes),
      },
      {
        path: 'notificaciones',
        loadComponent: () =>
          import(
            '@features/notificaciones/pages/notificacion-list/notificacion-list.component'
          ).then((m) => m.NotificacionListComponent),
      },
      {
        path: 'seleccion',
        loadChildren: () =>
          import('@features/seleccion/seleccion.routes').then((m) => m.seleccionRoutes),
      },
      {
        path: 'contrato',
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_ORH'] },
        loadComponent: () =>
          import('@features/contrato/pages/contrato-list/contrato-list.component').then(
            (m) => m.ContratoListComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN'] },
        loadChildren: () =>
          import('@features/admin/admin.routes').then((m) => m.adminRoutes),
      },
      // V34 — Banco de preguntas accesible por AREA_SOLICITANTE (fuera de módulo Selección)
      {
        path: 'banco-preguntas/:id',
        canActivate: [authGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_AREA_SOLICITANTE'] },
        loadComponent: () =>
          import('@features/seleccion/pages/banco-preguntas/banco-preguntas.component').then(
            (m) => m.BancoPreguntasComponent,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  { path: '', redirectTo: 'portal/convocatorias', pathMatch: 'full' },
  {
    path: '**',
    loadComponent: () =>
      import('@shared/components/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
