import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { CuadroMeritosResponse, MeritoItem } from '../../models/seleccion.model';

@Component({
  selector: 'app-cuadro-meritos',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Cuadro de Méritos"
        subtitle="E29 · RF-16 · Puntaje total ponderado · E30 — Descarga PDF resultados">
        <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']" class="btn-ghost text-sm">← Postulantes</a>
      </app-page-header>

      <div class="card space-y-4">
        @if (cargando()) {
          <p class="text-sm text-gray-500">Cargando cuadro de méritos...</p>
        } @else if (!cuadro()) {
          <p class="text-sm text-gray-600">
            Este proceso calculará el puntaje total ponderado para cada postulante APTO
            y determinará GANADOR, ACCESITARIO y NO_SELECCIONADO según los pesos definidos en los factores.
          </p>
          <div class="flex gap-2">
            <button
              (click)="calcular()"
              [disabled]="calculando()"
              class="btn-primary"
            >
              {{ calculando() ? 'Calculando...' : 'Calcular Cuadro de Méritos RF-16' }}
            </button>
          </div>
        } @else {
          <div class="bg-green-50 border border-green-200 rounded p-3">
            <p class="font-semibold text-sm text-green-700">✓ {{ cuadro()!.mensaje }}</p>
            <p class="text-xs text-gray-500 mt-1">N° Convocatoria: {{ cuadro()!.numeroConvocatoria }} · Total: {{ cuadro()!.totalPostulantes }} postulante(s)</p>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-[#1F2133] text-white">
                  <th class="px-3 py-2 text-center">N°</th>
                  <th class="px-3 py-2 text-left">Apellidos y Nombres</th>
                  <th class="px-3 py-2 text-center">P. Curricular</th>
                  <th class="px-3 py-2 text-center">P. Técnica</th>
                  <th class="px-3 py-2 text-center">Entrevista</th>
                  <th class="px-3 py-2 text-center">Bonificación</th>
                  <th class="px-3 py-2 text-center font-bold">P. Total</th>
                  <th class="px-3 py-2 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody>
                @for (m of cuadro()!.cuadro; track m.ordenMerito) {
                  <tr [class]="rowClass(m)">
                    <td class="px-3 py-2 text-center font-bold">{{ m.ordenMerito }}</td>
                    <td class="px-3 py-2">{{ m.nombrePostulante }}</td>
                    <td class="px-3 py-2 text-center">{{ m.puntajeCurricular ?? '—' }}</td>
                    <td class="px-3 py-2 text-center">{{ m.puntajeTecnica ?? '—' }}</td>
                    <td class="px-3 py-2 text-center">{{ m.puntajeEntrevista ?? '—' }}</td>
                    <td class="px-3 py-2 text-center">{{ m.puntajeBonificacion ?? '—' }}</td>
                    <td class="px-3 py-2 text-center font-bold">{{ m.puntajeTotal ?? '—' }}</td>
                    <td class="px-3 py-2 text-center">
                      <span [class]="resultadoClass(m.resultado)">{{ m.resultado }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap gap-2 justify-end">
            <button
              (click)="descargarPdf()"
              [disabled]="descargando()"
              class="btn-secondary text-sm"
            >
              {{ descargando() ? '⏳ Descargando...' : '📄 Descargar PDF Resultados (E30)' }}
            </button>
            @if (esFinalizada()) {
              <button class="btn-primary text-sm opacity-50 cursor-not-allowed" disabled title="Resultados ya publicados">
                ✓ Resultados publicados (E31)
              </button>
            } @else {
              <a [routerLink]="['/sistema/seleccion', idConv, 'publicar']" class="btn-primary text-sm">
                E31 — Publicar Resultados →
              </a>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class CuadroMeritosComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly seleccionService = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  readonly cargando = signal(true);
  readonly calculando = signal(false);
  readonly descargando = signal(false);
  readonly cuadro = signal<CuadroMeritosResponse | null>(null);
  readonly esFinalizada = signal(false);

  ngOnInit(): void {
    forkJoin({
      cuadro: this.seleccionService.obtenerCuadroMeritos(this.idConv).pipe(catchError(() => of(null))),
      conv: this.seleccionService.obtenerConvocatoria(this.idConv).pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ cuadro, conv }) => {
        this.cuadro.set(cuadro);
        this.esFinalizada.set(conv?.estado === 'FINALIZADA');
        this.cargando.set(false);
      });
  }

  calcular(): void {
    if (this.calculando()) return;
    this.calculando.set(true);
    this.seleccionService
      .cuadroMeritos(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.cuadro.set(res);
          this.toast.success(res.mensaje);
          this.calculando.set(false);
        },
        error: (err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message ?? 'Error al calcular cuadro de méritos.');
          this.calculando.set(false);
        },
      });
  }

  descargarPdf(): void {
    if (this.descargando()) return;
    this.descargando.set(true);
    this.seleccionService
      .resultadosPdf(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `RESULTADOS-${this.idConv}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          this.descargando.set(false);
        },
        error: () => {
          this.toast.error('Error al descargar el PDF de resultados.');
          this.descargando.set(false);
        },
      });
  }

  rowClass(m: MeritoItem): string {
    if (m.resultado === 'GANADOR') return 'border-t bg-green-50';
    if (m.resultado === 'ACCESITARIO') return 'border-t bg-yellow-50';
    return 'border-t';
  }

  resultadoClass(resultado: string): string {
    if (resultado === 'GANADOR') return 'font-bold text-green-700';
    if (resultado === 'ACCESITARIO') return 'font-semibold text-yellow-700';
    return 'text-gray-500';
  }
}
