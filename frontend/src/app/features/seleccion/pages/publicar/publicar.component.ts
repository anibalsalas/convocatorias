import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { PublicarResultadosResponse } from '../../models/seleccion.model';

@Component({
  selector: 'app-publicar-seleccion',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 max-w-2xl">
      <app-page-header
        title="Publicar Resultados"
        subtitle="E31 · Transición EN_SELECCION → FINALIZADA · Notificación a postulantes">
        <a [routerLink]="['/sistema/seleccion', idConv, 'cuadro-meritos']" class="btn-ghost text-sm">← Cuadro Méritos</a>
      </app-page-header>

      @if (cargando()) {
        <div class="card p-6">
          <p class="text-sm text-gray-500">Verificando estado de la convocatoria...</p>
        </div>
      } @else if (yaFinalizada() && !publicado()) {
        <div class="card space-y-4">
          <div class="bg-green-50 border border-green-200 rounded p-4 text-center">
            <div class="text-4xl mb-2">✓</div>
            <h2 class="text-lg font-bold text-green-700">Resultados ya publicados</h2>
            <p class="text-sm text-gray-600 mt-1">Esta convocatoria ya fue finalizada previamente.</p>
          </div>
          <div class="flex gap-2 justify-end">
            <a [routerLink]="['/sistema/seleccion', idConv, 'cuadro-meritos']" class="btn-ghost text-sm">← Cuadro Méritos</a>
            <a routerLink="/sistema/seleccion" class="btn-primary text-sm">← Volver a Selección</a>
          </div>
        </div>
      } @else if (!publicado()) {
        <div class="card space-y-4">
          <div class="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-800">
            <strong>⚠ Acción irreversible</strong>
            <p class="mt-1">Al publicar los resultados, la convocatoria pasará al estado <strong>FINALIZADA</strong>.
            No podrá modificar el cuadro de méritos después de esta acción.</p>
          </div>

          <ul class="text-sm text-gray-700 space-y-1 list-disc ml-4">
            <li>Se notificará a todos los postulantes sobre los resultados.</li>
            <li>El ganador recibirá instrucciones para suscribir el contrato CAS.</li>
            <li>Los accesitarios quedarán en reserva ante eventualidades.</li>
            <li>Los resultados serán visibles en el portal del postulante.</li>
          </ul>

          <div class="flex gap-2 justify-end">
            <a [routerLink]="['/sistema/seleccion']" class="btn-ghost">Cancelar</a>
            <button
              (click)="publicar()"
              [disabled]="publicando()"
              class="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
            >
              {{ publicando() ? 'Publicando...' : 'Confirmar y Publicar Resultados' }}
            </button>
          </div>
        </div>
      } @else {
        <div class="card bg-green-50 border border-green-200 space-y-4">
          <div class="text-center py-4">
            <div class="text-4xl mb-2">✓</div>
            <h2 class="text-lg font-bold text-green-700">Resultados Publicados</h2>
            <p class="text-sm text-gray-600 mt-1">{{ resultado()!.mensaje }}</p>
            <p class="text-xs text-gray-500 mt-1">N° Convocatoria: {{ resultado()!.numeroConvocatoria }}</p>
            <p class="text-sm text-blue-700 font-medium mt-2">
              📧 {{ resultado()!.notificacionesEncoladas }} notificaciones enviadas a los postulantes
            </p>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-[#1F2133] text-white">
                  <th class="px-3 py-1 text-center">N°</th>
                  <th class="px-3 py-1 text-left">Apellidos y Nombres</th>
                  <th class="px-3 py-1 text-center">Puntaje Total</th>
                  <th class="px-3 py-1 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody>
                @for (m of resultado()!.cuadro; track m.ordenMerito) {
                  <tr [class]="m.resultado === 'GANADOR' ? 'border-t bg-green-50' : m.resultado === 'ACCESITARIO' ? 'border-t bg-yellow-50' : 'border-t'">
                    <td class="px-3 py-1 text-center font-bold">{{ m.ordenMerito }}</td>
                    <td class="px-3 py-1">{{ m.nombrePostulante }}</td>
                    <td class="px-3 py-1 text-center font-semibold">{{ m.puntajeTotal ?? '—' }}</td>
                    <td class="px-3 py-1 text-center font-bold"
                      [class]="m.resultado === 'GANADOR' ? 'text-green-700' : m.resultado === 'ACCESITARIO' ? 'text-yellow-700' : 'text-gray-500'">
                      {{ m.resultado }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="flex gap-2 justify-end py-2">
            <a routerLink="/sistema/seleccion" class="btn-primary text-sm">← Volver a Selección</a>
          </div>
        </div>
      }
    </div>
  `,
})
export class PublicarSeleccionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seleccionService = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  readonly publicando = signal(false);
  readonly publicado = signal(false);
  readonly yaFinalizada = signal(false);
  readonly cargando = signal(true);
  readonly resultado = signal<PublicarResultadosResponse | null>(null);

  ngOnInit(): void {
    this.seleccionService
      .obtenerConvocatoria(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conv) => {
          if (conv?.estado === 'FINALIZADA') {
            this.yaFinalizada.set(true);
          }
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }

  publicar(): void {
    if (this.publicando()) return;
    this.publicando.set(true);
    this.seleccionService
      .publicarResultados(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.resultado.set(res);
          this.publicado.set(true);
          this.toast.success(`Resultados publicados. ${res.notificacionesEncoladas} notificaciones encoladas.`);
          this.publicando.set(false);
        },
        error: (err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message ?? 'Error al publicar resultados.');
          this.publicando.set(false);
        },
      });
  }
}
