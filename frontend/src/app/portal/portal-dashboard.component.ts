import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-portal-dashboard',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .dashboard-bg {
      background-image: url('/assets/images/fondo.jpeg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      min-height: calc(100vh - 8rem);
      width: 100%;
    }
  `],
  template: `
    <div class="dashboard-bg">
      <div class="max-w-5xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">
        Bienvenido, {{ auth.currentUser()?.nombreCompleto }}
      </h1>
      <p class="text-gray-500 mb-8">
        Panel del postulante — desde aquí puede revisar convocatorias vigentes y registrar su postulación.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          routerLink="/portal/convocatorias-vigentes"
          class="card hover:shadow-md transition group"
        >
          <div class="text-3xl mb-3">📋</div>
          <h3 class="font-bold text-gray-800 group-hover:text-[#1F2133] transition">
            Convocatorias Vigentes
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Revise convocatorias abiertas y postule desde cada fila
          </p>
        </a>

        <a
          routerLink="/portal/mi-perfil"
          class="card hover:shadow-md transition group"
        >
          <div class="text-3xl mb-3">👤</div>
          <h3 class="font-bold text-gray-800 group-hover:text-[#1F2133] transition">
            Mi Perfil
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Edite sus datos personales y sustentos
          </p>
        </a>

        <a
          routerLink="/portal/postulaciones"
          class="card hover:shadow-md transition group"
        >
          <div class="text-3xl mb-3">📩</div>
          <h3 class="font-bold text-gray-800 group-hover:text-[#1F2133] transition">
            Mis postulaciones
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Consulte el estado de sus postulaciones
          </p>
        </a>

        <div class="card opacity-50">
          <div class="text-3xl mb-3">🔔</div>
          <h3 class="font-bold text-gray-800">Notificaciones</h3>
          <p class="text-sm text-gray-500 mt-1">Disponible en entrega posterior</p>
        </div>
      </div>
      </div>
    </div>
  `,
})
export class PortalDashboardComponent {
  readonly auth = inject(AuthService);
}