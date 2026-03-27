import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  PostulacionSeleccion,
  EvalTecnicaRequest,
  EvalTecnicaResponse,
  FactorDetalle,
} from '../../models/seleccion.model';

interface EntradaTec {
  codigoAnonimo: string;
  /** Nombre completo — oculto durante evaluación, visible post-submit (levantamiento) */
  nombre: string;
  puntaje: number;
  observacion: string;
  /** true si ya tenía puntajeTecnica cargado desde backend — indica re-evaluación */
  yaEvaluado: boolean;
  /** true cuando el usuario presionó ✏ Editar en esta fila post-submit */
  editando: boolean;
}

@Component({
  selector: 'app-eval-tecnica',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    .anon-bg   { background: #1A1A2E; }
    .anon-text { color: #E0E0FF; font-family: 'JetBrains Mono','Courier New',monospace; }
    .anon-input {
      background: #16213E; border: 1px solid #0F3460;
      color: #E0E0FF; border-radius: 4px; padding: 4px 8px;
      font-family: 'JetBrains Mono', monospace;
      transition: border-color .15s;
    }
    .anon-input:focus  { outline: none; border-color: #53D8FB; }
    .anon-input.apto   { border-color: #22c55e; }
    .anon-input.noApto { border-color: #ef4444; }
    .anon-head  { background: #0F3460; color: #53D8FB; }
    .anon-row   { border-top: 1px solid #2A2A4A; }
    .anon-row:hover { background: #1E2A4A; }
  `],
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Evaluación Técnica — Modo Anónimo"
        subtitle="E26 · RF-11 · D.L. 1451 · Solo códigos anónimos visibles">
        <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
           class="btn-ghost text-sm">← Postulantes</a>
      </app-page-header>

      <!-- Banner D.L.1451 obligatorio -->
      <div class="rounded-lg p-4 anon-bg anon-text border border-blue-900">
        <div class="flex items-start gap-3">
          <span class="text-2xl flex-shrink-0">🔒</span>
          <div>
            <p class="font-bold text-sm tracking-wide text-blue-300">
              MODO ANÓNIMO ACTIVO — D.L. 1451 · Art. 6
            </p>
            <p class="text-xs text-blue-400 mt-0.5">
              Los nombres reales están ocultos durante esta evaluación técnica.
              Solo se muestran los códigos asignados para garantizar
              imparcialidad. El sistema registra el evaluador desde el JWT automáticamente.
            </p>
            <div class="flex flex-wrap gap-4 text-xs text-blue-300 border-t border-blue-900 pt-2 mt-2">
              <span>📋 Base legal: D.L. 1451</span>
              <span>🏷️ {{ convNumero() || ('Conv. #' + idConv) }}</span>
              <span>📊 Umbral aprobación: {{ umbralTexto() }}</span>
            </div>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="card py-10 text-center text-gray-400">
          <span class="animate-spin inline-block mr-2 text-xl">⟳</span>
          <p class="mt-2 text-sm">Cargando códigos anónimos...</p>
        </div>

      } @else if (entradas().length === 0) {
        <div class="card py-10 text-center space-y-3">
          <p class="text-gray-500 font-medium">
            No hay postulantes con código anónimo asignado.
          </p>
          <p class="text-xs text-gray-400">
            Primero ejecute E25 — Asignación de Códigos Anónimos (ROL: ORH).
          </p>
          <a [routerLink]="['/sistema/seleccion', idConv, 'codigos-anonimos']"
             class="btn-secondary text-sm inline-block">
            ←  Códigos Anónimos
          </a>
        </div>

      } @else {
        <!-- Aviso de re-evaluación — protección contra borrado accidental -->
        @if (yaEvaluadoPrevio() && !resultado()) {
          <div class="card border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
            <span class="text-amber-500 mt-0.5">⚠</span>
            <div>
              <p class="text-sm font-semibold text-amber-700">
                Esta evaluación ya fue registrada previamente.
              </p>
              <p class="text-xs text-amber-600 mt-0.5">
                Los puntajes actuales se pre-cargan de la evaluación anterior.
                Si modifica y guarda, se sobreescribirán los valores registrados.
              </p>
            </div>
          </div>

          <!-- Botón republicar PDF — visible al re-ingresar a E26 (solo COMITÉ/ADMIN) -->
          @if (esComiteOAdmin()) {
            <div class="card border border-blue-200 bg-blue-50 p-3 flex flex-wrap items-center gap-3">
              <button
                (click)="publicarResultados()"
                [disabled]="publicando()"
                class="btn-primary text-sm disabled:opacity-50"
              >
                {{ publicando() ? '⟳ Publicando...' : '📢 Publicar Evaluación Técnica' }}
              </button>
              <span class="text-xs text-gray-500">
                Re-descarga el PDF con los resultados ya registrados.
              </span>
              @if (tecnicaPublicada()) {
                <a [routerLink]="['/sistema/seleccion', idConv, 'entrevista']"
                   class="btn-secondary text-sm inline-block">
                  Continuar → E27 Entrevista Personal
                </a>
              }
            </div>
          }
        }

        <!-- Resultado tras envío -->
        @if (resultado()) {
          <div class="card border border-green-300 bg-green-50 p-4 space-y-2">
            <p class="font-semibold text-green-700 text-sm">
              ✓ Evaluación técnica registrada — {{ resultado()!.mensaje }}
            </p>
            <div class="flex flex-wrap gap-6 text-sm">
              <div>Evaluados: <strong>{{ resultado()!.totalEvaluados }}</strong></div>
              @if (resultado()!.umbralAplicado) {
                <div class="text-blue-700">
                  Umbral aplicado: <strong>{{ resultado()!.umbralAplicado }} pts</strong>
                </div>
              }
            </div>

            <!-- Publicar Evaluación Técnica — solo COMITÉ/ADMIN -->
            @if (esComiteOAdmin()) {
              <div class="flex items-center gap-3 pt-1">
                <button
                  (click)="publicarResultados()"
                  [disabled]="publicando()"
                  class="btn-primary text-sm disabled:opacity-50"
                >
                  {{ publicando() ? '⟳ Publicando...' : '📢 Publicar Evaluación Técnica' }}
                </button>
                <span class="text-xs text-gray-500">
                  Una vez publicado, los resultados estarán visibles en el portal público.
                </span>
              </div>
            }

            @if (tecnicaPublicada()) {
              <a [routerLink]="['/sistema/seleccion', idConv, 'entrevista']"
                 class="btn-secondary text-sm inline-block mt-1">
                Continuar → E27 Entrevista Personal
              </a>
            }
          </div>
        }

        <!-- Levantamiento del Anonimato — visible post-submit para todos los roles -->
        @if (resultado()) {
          <div class="card border border-indigo-200 bg-indigo-50 p-4">
            <p class="font-semibold text-indigo-700 text-sm mb-3">
              🔓 Levantamiento del Anonimato — Correspondencia Código / Nombre
            </p>
            <p class="text-xs text-indigo-500 mb-3">
              D.L. 1451 Art. 6: La identidad se revela únicamente después de registrar la evaluación.
              Esta información es de acceso interno — no se publica en el portal.
            </p>
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-indigo-100">
                  <th class="px-3 py-2 text-left text-xs font-semibold text-indigo-700 w-40">Código Anónimo</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-indigo-700">Nombre Completo</th>
                  <th class="px-3 py-2 text-center text-xs font-semibold text-indigo-700 w-28">Puntaje</th>
                  <th class="px-3 py-2 text-center text-xs font-semibold text-indigo-700 w-24">Resultado</th>
                  @if (esComiteOAdmin()) {
                    <th class="px-3 py-2 text-center text-xs font-semibold text-indigo-700 w-20">Editar</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (e of entradas(); track e.codigoAnonimo; let i = $index) {
                  <tr class="border-t border-indigo-100 hover:bg-indigo-50">
                    <td class="px-3 py-2 font-mono text-xs text-indigo-600 font-bold">
                      {{ e.codigoAnonimo }}
                    </td>
                    <td class="px-3 py-2 text-sm text-gray-800">{{ e.nombre }}</td>
                    <td class="px-3 py-2 text-center">
                      @if (e.editando && esComiteOAdmin()) {
                        <input
                          type="number"
                          [ngModel]="e.puntaje"
                          (ngModelChange)="actualizarPuntaje(i, $event)"
                          min="0"
                          [attr.max]="puntajeMaxDinamico()"
                          step="0.5"
                          class="border rounded px-2 py-1 w-20 text-center text-sm"
                        />
                      } @else {
                        <span class="font-semibold">{{ e.puntaje }}</span>
                      }
                    </td>
                    <td class="px-3 py-2 text-center text-xs font-semibold"
                        [class.text-green-600]="e.puntaje >= umbralDinamico() && e.puntaje > 0"
                        [class.text-red-600]="e.puntaje > 0 && e.puntaje < umbralDinamico()"
                        [class.text-gray-400]="e.puntaje <= 0">
                      @if (e.puntaje <= 0) { — }
                      @else if (e.puntaje >= umbralDinamico()) { ✓ APTO }
                      @else { ✗ NO APTO }
                    </td>
                    @if (esComiteOAdmin()) {
                      <td class="px-3 py-2 text-center">
                        @if (!e.editando) {
                          <button
                            (click)="habilitarEdicion(i)"
                            class="btn-ghost text-xs py-1 px-2"
                            title="Editar puntaje de este postulante"
                          >✏ Editar</button>
                        } @else {
                          <button
                            (click)="guardarEdicion(i)"
                            [disabled]="guardando()"
                            class="btn-primary text-xs py-1 px-2 disabled:opacity-50"
                          >✓ Guardar</button>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Banner solo lectura — visible cuando resultados ya fueron publicados -->
        @if (!resultado() && tecnicaPublicada()) {
          <div class="card border border-green-300 bg-green-50 p-3 flex items-center gap-3">
            <span class="text-green-600 text-lg flex-shrink-0">✓</span>
            <div>
              <p class="text-sm font-semibold text-green-700">
                Resultados Técnicos publicados — Vista de Solo Lectura
              </p>
              <p class="text-xs text-green-600 mt-0.5">
                Los puntajes registrados por el Comité son definitivos y están disponibles en el portal público.
              </p>
            </div>
          </div>
        }

        <!-- Resumen pre-envío -->
        @if (!resultado()) {
          <div class="card flex flex-wrap gap-4 text-sm text-gray-600">
            <span>Total: <strong>{{ entradas().length }}</strong></span>
            <span class="text-green-700">
              ≥ umbral RF-14: <strong>{{ aptosCount() }}</strong>
            </span>
            <span class="text-red-700">
              &lt; umbral RF-14: <strong>{{ noAptosCount() }}</strong>
            </span>
            @if (sinPuntajeCount() > 0) {
              <span class="text-amber-600">
                Sin puntaje: <strong>{{ sinPuntajeCount() }}</strong>
              </span>
            }
          </div>

          <!-- Tabla anónima -->
          <div class="rounded-lg overflow-hidden anon-bg border border-blue-900">
            <div class="px-4 py-3 border-b border-blue-900 flex items-center justify-between">
              <div>
                <p class="text-xs text-blue-300 font-semibold tracking-widest">
                  TABLA DE EVALUACIÓN TÉCNICA — MODO ANÓNIMO
                </p>
                <p class="text-xs text-blue-500 mt-0.5">
                  Evalúe únicamente por mérito. Los nombres están ocultos conforme D.L. 1451.
                </p>
              </div>
              <span class="text-xs text-blue-400 font-mono">
                {{ entradas().length }} código(s)
              </span>
            </div>

            <table class="w-full text-sm">
              <thead>
                <tr class="anon-head">
                  <th class="px-4 py-2 text-left text-xs font-mono tracking-wider">
                    CÓDIGO ANÓNIMO
                  </th>
                  <th class="px-4 py-2 text-center text-xs">PUNTAJE (0–{{ puntajeMaxDinamico() }})</th>
                  <th class="px-4 py-2 text-center text-xs w-24">RESULTADO</th>
                  <th class="px-4 py-2 text-left text-xs">OBSERVACIÓN</th>
                </tr>
              </thead>
              <tbody>
                @for (e of entradas(); track e.codigoAnonimo; let i = $index) {
                  <tr class="anon-row">
                    <td class="px-4 py-3">
                      <span class="font-mono font-bold text-sm"
                            [class]="e.puntaje > 0 ? 'text-[#53D8FB]' : 'text-blue-400'">
                        {{ e.codigoAnonimo }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <input
                        type="number"
                        [ngModel]="e.puntaje"
                        (ngModelChange)="actualizarPuntaje(i, $event)"
                        min="0"
                        [attr.max]="puntajeMaxDinamico()"
                        step="0.5"
                        class="anon-input w-24 text-center"
                        [class.apto]="e.puntaje >= umbralDinamico() && e.puntaje > 0"
                        [class.noApto]="e.puntaje > 0 && e.puntaje < umbralDinamico()"
                        placeholder="0"
                        [attr.aria-label]="'Puntaje técnica para ' + e.codigoAnonimo"
                        [disabled]="tecnicaPublicada()"
                      />
                    </td>
                    <td class="px-4 py-3 text-center">
                      @if (e.puntaje <= 0) {
                        <span class="text-xs text-blue-500">—</span>
                      } @else if (e.puntaje >= umbralDinamico()) {
                        <span class="text-xs font-semibold text-green-400">✓ APTO</span>
                      } @else {
                        <span class="text-xs font-semibold text-red-400">✗ NO APTO</span>
                      }
                    </td>
                    <td class="px-4 py-3">
                      <input
                        type="text"
                        [(ngModel)]="e.observacion"
                        class="anon-input w-full text-xs"
                        placeholder="Observación técnica..."
                        [attr.aria-label]="'Observación para ' + e.codigoAnonimo"
                        [disabled]="tecnicaPublicada()"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (sinPuntajeCount() > 0) {
            <p class="text-xs text-amber-600 text-right">
              ⚠ Faltan {{ sinPuntajeCount() }} puntaje(s) por ingresar.
            </p>
          }

          <!-- Acciones -->
          <div class="flex gap-2 justify-end">
            <a [routerLink]="['/sistema/seleccion', idConv, 'codigos-anonimos']"
               class="btn-ghost text-sm">← Códigos Anónimos</a>
            <button
              (click)="guardar()"
              [disabled]="guardando() || sinPuntajeCount() > 0 || tecnicaPublicada()"
              class="btn-primary disabled:opacity-50"
            >
              {{ tecnicaPublicada()
                ? '✓ Publicado — Solo Lectura'
                : guardando()
                ? '⟳ Registrando...'
                : yaEvaluadoPrevio()
                ? 'Actualizar Evaluación Técnica (E26)'
                : 'Registrar Evaluación Técnica (E26)' }}
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class EvalTecnicaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly entradas = signal<EntradaTec[]>([]);
  protected readonly resultado = signal<EvalTecnicaResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly guardando = signal(false);
  protected readonly publicando = signal(false);
  /** true cuando todos los postulantes ya tenían puntajeTecnica al cargar — re-evaluación */
  protected readonly yaEvaluadoPrevio = signal(false);
  /** Número de convocatoria legible (CAS-022-2026) cargado desde API */
  protected readonly convNumero = signal('');
  protected readonly tecnicaPublicada = signal(false);
  /**
   * Umbral mínimo de aprobación técnica — cargado desde TBL_FACTOR_EVALUACION.PUNTAJE_MINIMO
   * (factor padre TECNICA de la convocatoria, configurado en E12 por el COMITÉ).
   * Fallback 60 = coherente con el 60% que aplica el backend si puntajeMinimo = 0.
   */
  protected readonly umbralDinamico = signal(60);
  /**
   * Puntaje máximo del examen técnico — cargado desde TBL_FACTOR_EVALUACION.PUNTAJE_MAXIMO
   * (factor padre TECNICA). Fallback 100.
   */
  protected readonly puntajeMaxDinamico = signal(100);

  protected readonly esComiteOAdmin = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_COMITE']),
  );

  protected readonly umbralTexto = computed(() => {
    const res = this.resultado();
    if (res?.umbralAplicado) return `${res.umbralAplicado} pts (confirmado)`;
    return `${this.umbralDinamico()} pts (Motor RF-14)`;
  });

  protected readonly aptosCount = computed(() =>
    this.entradas().filter((e) => e.puntaje >= this.umbralDinamico() && e.puntaje > 0).length,
  );

  protected readonly noAptosCount = computed(() =>
    this.entradas().filter((e) => e.puntaje > 0 && e.puntaje < this.umbralDinamico()).length,
  );

  protected readonly sinPuntajeCount = computed(() =>
    this.entradas().filter((e) => e.puntaje <= 0).length,
  );

  constructor() {
    this.cargarPostulantes();
    this.cargarConvocatoria();
    this.cargarFactores();
  }

  private cargarPostulantes(): void {
    this.svc
      .listarPostulantes(this.idConv, 0, 200)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const conCodigo = (page.content ?? []).filter(
            (p: PostulacionSeleccion) =>
              p.codigoAnonimo != null && (
                p.estado === 'APTO' || p.estado === 'NO_APTO' ||
                p.estado === 'GANADOR' || p.estado === 'ACCESITARIO' || p.estado === 'NO_SELECCIONADO'
              ),
          );

          const todosYaEvaluados =
            conCodigo.length > 0 && conCodigo.every((p) => p.puntajeTecnica != null);
          this.yaEvaluadoPrevio.set(todosYaEvaluados);

          this.entradas.set(
            conCodigo.map((p: PostulacionSeleccion) => ({
              codigoAnonimo: p.codigoAnonimo!,
              nombre: p.postulante?.nombreCompleto ?? '—',
              puntaje: p.puntajeTecnica ?? 0,
              observacion: '',
              yaEvaluado: p.puntajeTecnica != null,
              editando: false,
            })),
          );
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Error al cargar postulantes.');
        },
      });
  }

  private cargarConvocatoria(): void {
    this.svc
      .obtenerConvocatoria(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conv) => {
          this.convNumero.set(conv.numeroConvocatoria ?? '');
          const publicada = conv.resultadosTecnicosPublicados ?? false;
          this.tecnicaPublicada.set(publicada);

          // ORH solo puede acceder en modo lectura — redirige si aún no publicado
          const esOrh = this.auth.hasAnyRole(['ROLE_ORH']) && !this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_COMITE']);
          if (esOrh && !publicada) {
            this.toast.error('Solo puede consultar la evaluación técnica una vez publicados los resultados.');
            this.router.navigate(['/sistema/seleccion', this.idConv, 'postulantes']);
          }
        },
        error: () => { /* no bloquea — banner muestra fallback Conv. #id */ },
      });
  }

  /**
   * Carga el factor padre TECNICA para obtener puntajeMaximo y puntajeMinimo dinámicos.
   * Si falla, usa defaults (100 / 60).
   */
  private cargarFactores(): void {
    this.svc
      .listarFactores(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (factores: FactorDetalle[]) => {
          const padreTecnica = factores.find(
            (f) => f.etapaEvaluacion === 'TECNICA' && f.idFactorPadre == null,
          );
          if (!padreTecnica) return;

          if (padreTecnica.puntajeMaximo > 0) {
            this.puntajeMaxDinamico.set(padreTecnica.puntajeMaximo);
          }
          if (padreTecnica.puntajeMinimo > 0) {
            this.umbralDinamico.set(padreTecnica.puntajeMinimo);
          } else if (padreTecnica.puntajeMaximo > 0) {
            this.umbralDinamico.set(
              Math.round(padreTecnica.puntajeMaximo * 0.6 * 100) / 100,
            );
          }
        },
        error: () => { /* no bloquea — se usan valores default 100/60 */ },
      });
  }

  /**
   * Actualiza el puntaje por índice creando nueva referencia de array
   * para que los computed (sinPuntajeCount, aptosCount, noAptosCount) se re-evalúen.
   */
  protected actualizarPuntaje(index: number, valor: number | string): void {
    const puntaje = Number(valor) || 0;
    this.entradas.update((list) =>
      list.map((e, i) => (i === index ? { ...e, puntaje } : e)),
    );
  }

  /** Habilita la edición en línea de un puntaje post-submit (fila en levantamiento). */
  protected habilitarEdicion(index: number): void {
    this.entradas.update((list) =>
      list.map((e, i) => (i === index ? { ...e, editando: true } : e)),
    );
  }

  /** Guarda la edición de un puntaje y re-envía toda la evaluación al backend. */
  protected guardarEdicion(index: number): void {
    this.entradas.update((list) =>
      list.map((e, i) => (i === index ? { ...e, editando: false } : e)),
    );
    this.guardar();
  }

  protected guardar(): void {
    if (this.guardando()) return;

    const req: EvalTecnicaRequest = {
      evaluaciones: this.entradas().map((e) => ({
        codigoAnonimo: e.codigoAnonimo,
        puntaje: Number(e.puntaje),
        observacion: e.observacion || undefined,
      })),
    };

    this.guardando.set(true);
    this.svc
      .evalTecnica(this.idConv, req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.resultado.set(res);
          this.yaEvaluadoPrevio.set(false);
          this.guardando.set(false);
          this.toast.success('Evaluación técnica registrada correctamente.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.guardando.set(false);
          this.toast.error(err?.error?.message ?? 'Error al registrar la evaluación técnica.');
        },
      });
  }

  /** Publica los resultados técnicos (persiste flag + descarga PDF) — solo COMITÉ/ADMIN. */
  protected publicarResultados(): void {
    if (this.publicando()) return;
    this.publicando.set(true);
    this.svc
      .publicarResultadosTecnica(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `RESULT-TECNICA-${this.convNumero() || this.idConv}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          this.publicando.set(false);
          this.tecnicaPublicada.set(true);
          this.toast.success('Resultados de evaluación técnica publicados. PDF descargado.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.publicando.set(false);
          this.toast.error(err?.error?.message ?? 'Error al publicar los resultados técnicos.');
        },
      });
  }
}
