import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '@core/http/api.service';
import { PostulacionSeleccion } from '@features/seleccion/models/seleccion.model';

@Component({
  selector: 'app-mis-resultados',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 py-8 px-4">
      <div class="max-w-4xl mx-auto space-y-6">

        <div class="bg-[#1F2133] text-white rounded-xl p-6">
          <h1 class="text-xl font-bold">Mis Resultados</h1>
          <p class="text-gray-300 text-sm mt-1">Resultados del proceso de selección CAS — ACFFAA</p>
        </div>

        @if (loading()) {
          <div class="bg-white rounded-xl p-8 text-center text-gray-400">
            <span class="animate-spin inline-block mr-2">⟳</span> Cargando resultados...
          </div>
        } @else if (conResultado().length === 0) {
          <div class="bg-white rounded-xl p-8 text-center text-gray-500">
            <p class="text-lg">No hay resultados disponibles aún.</p>
            <p class="text-sm mt-2 text-gray-400">Los resultados se publicarán cuando finalice el proceso de selección.</p>
            <a routerLink="/portal/postulaciones" class="inline-block mt-4 text-sm text-blue-600 hover:underline">
              ← Ver mis postulaciones
            </a>
          </div>
        } @else {
          @for (p of conResultado(); track p.idPostulacion) {
            <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
              <!-- Header resultado -->
              <div [class]="headerClass(p.resultado)" class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h2 class="font-bold text-lg">{{ p.numeroConvocatoria || 'Convocatoria #' + p.idConvocatoria }}</h2>
                    <p class="text-sm opacity-80 mt-0.5">Proceso CAS — ACFFAA</p>
                  </div>
                  <div class="text-right">
                    <div [class]="badgeClass(p.resultado)" class="inline-block px-3 py-1 rounded-full font-bold text-sm">
                      {{ resultadoLabel(p.resultado) }}
                    </div>
                    @if (p.ordenMerito) {
                      <p class="text-sm mt-1 opacity-80">Orden de mérito: {{ p.ordenMerito }}</p>
                    }
                  </div>
                </div>
              </div>

              <!-- Puntajes -->
              <div class="px-6 py-4">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Detalle de puntajes</h3>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div class="bg-gray-50 rounded-lg p-3 text-center">
                    <div class="text-xs text-gray-500">Curricular</div>
                    <div class="text-lg font-bold text-gray-800 mt-1">
                      {{ p.puntajeCurricular != null ? (p.puntajeCurricular | number:'1.2-2') : '—' }}
                    </div>
                  </div>
                  <div class="bg-gray-50 rounded-lg p-3 text-center">
                    <div class="text-xs text-gray-500">Técnica</div>
                    <div class="text-lg font-bold text-gray-800 mt-1">
                      {{ p.puntajeTecnica != null ? (p.puntajeTecnica | number:'1.2-2') : '—' }}
                    </div>
                  </div>
                  <div class="bg-gray-50 rounded-lg p-3 text-center">
                    <div class="text-xs text-gray-500">Entrevista</div>
                    <div class="text-lg font-bold text-gray-800 mt-1">
                      {{ p.puntajeEntrevista != null ? (p.puntajeEntrevista | number:'1.2-2') : '—' }}
                    </div>
                  </div>
                  <div class="bg-gray-50 rounded-lg p-3 text-center">
                    <div class="text-xs text-gray-500">Bonificación</div>
                    <div class="text-lg font-bold text-green-600 mt-1">
                      +{{ p.puntajeBonificacion != null ? (p.puntajeBonificacion | number:'1.2-2') : '0.00' }}
                    </div>
                  </div>
                  <div class="bg-[#1F2133] rounded-lg p-3 text-center">
                    <div class="text-xs text-gray-400">Puntaje Total</div>
                    <div class="text-xl font-bold text-white mt-1">
                      {{ p.puntajeTotal != null ? (p.puntajeTotal | number:'1.2-2') : '—' }}
                    </div>
                  </div>
                </div>
              </div>

              @if (p.resultado === 'GANADOR') {
                <div class="px-6 py-3 bg-green-50 border-t border-green-100">
                  <p class="text-sm text-green-700 font-medium">
                    🎉 ¡Felicitaciones! Ha sido seleccionado. Espere la comunicación oficial para la suscripción del contrato CAS.
                  </p>
                </div>
              } @else if (p.resultado === 'ACCESITARIO') {
                <div class="px-6 py-3 bg-yellow-50 border-t border-yellow-100">
                  <p class="text-sm text-yellow-700 font-medium">
                    Usted se encuentra en lista de reserva. Será convocado si el ganador no suscribe el contrato.
                  </p>
                </div>
              }
            </div>
          }
        }

        <div class="text-center">
          <a routerLink="/portal/postulaciones" class="text-sm text-blue-600 hover:underline">
            ← Ver todas mis postulaciones
          </a>
        </div>
      </div>
    </div>
  `,
})
export class MisResultadosComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  private readonly postulaciones = signal<PostulacionSeleccion[]>([]);

  readonly conResultado = computed(() =>
    this.postulaciones().filter((p) =>
      ['GANADOR', 'ACCESITARIO', 'NO_SELECCIONADO'].includes(p.estado),
    ),
  );

  constructor() {
    this.api
      .getPage<PostulacionSeleccion>('/postulaciones', { page: 0, size: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.postulaciones.set(res.data?.content ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  resultadoLabel(resultado: string | null | undefined): string {
    if (resultado === 'GANADOR') return '🏆 GANADOR';
    if (resultado === 'ACCESITARIO') return '🔄 ACCESITARIO';
    if (resultado === 'NO_SELECCIONADO') return 'No seleccionado';
    return resultado ?? '—';
  }

  headerClass(resultado: string | null | undefined): string {
    if (resultado === 'GANADOR') return 'bg-gradient-to-r from-green-600 to-green-700 text-white';
    if (resultado === 'ACCESITARIO') return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
    return 'bg-gray-100 text-gray-700';
  }

  badgeClass(resultado: string | null | undefined): string {
    if (resultado === 'GANADOR') return 'bg-white text-green-700';
    if (resultado === 'ACCESITARIO') return 'bg-white text-yellow-700';
    return 'bg-gray-200 text-gray-600';
  }
}
