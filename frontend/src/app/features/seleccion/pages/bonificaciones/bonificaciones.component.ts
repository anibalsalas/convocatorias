import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { BonificacionResponse, BonifItem } from '../../models/seleccion.model';

interface BonifTipo {
  tipo: string;
  label: string;
  porcentaje: number;
  baseLegal: string;
  norma: string;
  icon: string;
  color: string;
  colorBg: string;
  colorBorder: string;
}

const TIPOS_BONIF: BonifTipo[] = [
  {
    tipo: 'FFAA',
    label: 'Licenciado de las FF.AA.',
    porcentaje: 10,
    baseLegal: 'Ley 29248',
    norma: 'Ley del Licenciado de las Fuerzas Armadas',
    icon: '🎖️',
    color: 'text-blue-700',
    colorBg: 'bg-blue-50',
    colorBorder: 'border-blue-300',
  },
  {
    tipo: 'DISCAPACIDAD',
    label: 'Persona con Discapacidad',
    porcentaje: 15,
    baseLegal: 'Ley 29973',
    norma: 'Ley General de la Persona con Discapacidad',
    icon: '♿',
    color: 'text-purple-700',
    colorBg: 'bg-purple-50',
    colorBorder: 'border-purple-300',
  },
  {
    tipo: 'DEPORTISTA',
    label: 'Deportista Destacado',
    porcentaje: 5,
    baseLegal: 'Ley 27674',
    norma: 'Ley del Deportista Calificado de Alto Nivel',
    icon: '🏅',
    color: 'text-amber-700',
    colorBg: 'bg-amber-50',
    colorBorder: 'border-amber-300',
  },
];

@Component({
  selector: 'app-bonificaciones',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Bonificaciones Legales"
        subtitle="E28 · RF-15 · Motor automático de bonificaciones según DDJJ del postulante">
        <a [routerLink]="['/sistema/seleccion', idConv, 'entrevista']" class="btn-ghost text-sm">← Entrevista</a>
      </app-page-header>

      <!-- Cards informativas por tipo -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        @for (tipo of tiposBonif; track tipo.tipo) {
          <div
            class="card border-2 transition-all"
            [class]="resultado() ? tipo.colorBorder + ' ' + tipo.colorBg : 'border-gray-200'"
          >
            <div class="flex items-center gap-3 mb-3">
              <span class="text-3xl">{{ tipo.icon }}</span>
              <div>
                <p class="font-bold text-lg" [class]="tipo.color">{{ tipo.porcentaje }}%</p>
                <p class="text-xs text-gray-500">sobre puntaje base</p>
              </div>
            </div>
            <p class="font-semibold text-sm">{{ tipo.label }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ tipo.norma }}</p>
            <p class="text-xs font-mono mt-2 px-2 py-0.5 rounded bg-white/50 inline-block" [class]="tipo.color">
              {{ tipo.baseLegal }}
            </p>
            @if (resultado()) {
              <div class="mt-3 border-t pt-2">
                <p class="text-xs text-gray-600">
                  Bonificados:
                  <strong [class]="tipo.color">
                    {{ contarPorTipo(tipo.tipo) }}
                  </strong>
                </p>
              </div>
            }
          </div>
        }
      </div>

      <!-- Fórmula visual -->
      <div class="card bg-gray-50 border border-gray-200 p-4">
        <p class="text-xs font-semibold text-gray-500 mb-2">FÓRMULA DE CÁLCULO:</p>
        <div class="flex flex-wrap items-center gap-2 text-sm font-mono">
          <span class="bg-white px-2 py-1 rounded border">Puntaje Base</span>
          <span class="text-gray-400">×</span>
          <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded">% Bonificación</span>
          <span class="text-gray-400">=</span>
          <span class="bg-green-100 text-green-700 px-2 py-1 rounded">Puntos Adicionales</span>
          <span class="text-gray-400">→</span>
          <span class="bg-amber-100 text-amber-700 px-2 py-1 rounded">Se SUMAN al cuadro de méritos</span>
        </div>
        <p class="text-xs text-gray-400 mt-2">
          Ejemplo: Puntaje 85.00 × 10% (FFAA) = <strong>8.50 puntos</strong> adicionales.
          Las bonificaciones son acumulables si el postulante cumple más de una condición.
        </p>
      </div>

      @if (!resultado()) {
        <div class="card space-y-3">
          <p class="text-sm text-gray-600">
            El Motor de Reglas RF-15 aplicará automáticamente las bonificaciones a los postulantes
            que declararon condición especial en su DDJJ (Declaración Jurada al postular).
          </p>
          <div class="flex gap-2">
            <button
              (click)="inyectar()"
              [disabled]="inyectando()"
              class="btn-primary"
            >
              {{ inyectando() ? 'Inyectando...' : 'Inyectar Bonificaciones RF-15' }}
            </button>
            <a [routerLink]="['/sistema/seleccion', idConv, 'cuadro-meritos']" class="btn-ghost">
              Continuar sin bonificaciones
            </a>
          </div>
        </div>
      } @else {

        <!-- Resumen -->
        <div class="card bg-green-50 border border-green-200 p-3">
          <p class="font-semibold text-sm text-green-700 mb-1">✓ {{ resultado()!.mensaje }}</p>
          <p class="text-xs text-gray-600">
            Total bonificados: <strong>{{ resultado()!.totalBonificados }}</strong> postulante(s) ·
            Convocatoria N° {{ idConv }}
          </p>
        </div>

        <!-- Tabla detalle -->
        <div class="card overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-[#1F2133] text-white">
                <th class="px-3 py-2 text-left">Postulante</th>
                <th class="px-3 py-2 text-center">Tipo</th>
                <th class="px-3 py-2 text-center">%</th>
                <th class="px-3 py-2 text-right">P. Base</th>
                <th class="px-3 py-2 text-right font-bold">+ Puntos</th>
                <th class="px-3 py-2 text-left">Base Legal</th>
              </tr>
            </thead>
            <tbody>
              @for (b of resultado()!.bonificaciones; track b.idPostulacion + b.tipoBonificacion) {
                <tr class="border-t hover:bg-gray-50">
                  <td class="px-3 py-2 font-medium">{{ b.nombrePostulante }}</td>
                  <td class="px-3 py-2 text-center">
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-semibold"
                      [class]="b.tipoBonificacion === 'FFAA'
                        ? 'bg-blue-100 text-blue-800'
                        : b.tipoBonificacion === 'DISCAPACIDAD'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-amber-100 text-amber-800'"
                    >
                      {{ b.tipoBonificacion }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-center font-semibold">{{ b.porcentaje }}%</td>
                  <td class="px-3 py-2 text-right">{{ b.puntajeBase | number:'1.2-2' }}</td>
                  <td class="px-3 py-2 text-right font-bold text-green-700">
                    +{{ b.puntajeAplicado | number:'1.2-2' }}
                  </td>
                  <td class="px-3 py-2 text-gray-500 font-mono text-xs">{{ b.baseLegal }}</td>
                </tr>
              }
              @if (resultado()!.bonificaciones.length === 0) {
                <tr>
                  <td colspan="6" class="px-3 py-6 text-center text-gray-400">
                    No hay postulantes con bonificación declarada.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="flex justify-end">
          <a [routerLink]="['/sistema/seleccion', idConv, 'cuadro-meritos']" class="btn-primary text-sm">
            E29 — Calcular Cuadro de Méritos →
          </a>
        </div>
      }
    </div>
  `,
})
export class BonificacionesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly resultado = signal<BonificacionResponse | null>(null);
  protected readonly inyectando = signal(false);
  protected readonly tiposBonif = TIPOS_BONIF;

  protected contarPorTipo(tipo: string): number {
    return (
      this.resultado()?.bonificaciones.filter((b) => b.tipoBonificacion === tipo).length ?? 0
    );
  }

  protected inyectar(): void {
    this.inyectando.set(true);
    this.svc
      .bonificaciones(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.resultado.set(res);
          this.inyectando.set(false);
          this.toast.success(`Bonificaciones inyectadas: ${res.totalBonificados} postulante(s).`);
        },
        error: () => {
          this.inyectando.set(false);
          this.toast.error('Error al inyectar bonificaciones.');
        },
      });
  }
}
