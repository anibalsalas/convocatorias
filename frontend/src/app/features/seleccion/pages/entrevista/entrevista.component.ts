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
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  PostulacionSeleccion,
  MiembroComiteItem,
  EntrevistaResponse,
  FactorDetalle,
} from '../../models/seleccion.model';

interface EntradaEntrevista {
  idPostulacion: number;
  nombre: string;
  puntajes: {
    idMiembroComite: number;
    nombre: string;
    puntaje: number;
    observacion: string;
  }[];
}

@Component({
  selector: 'app-entrevista',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeaderComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        [title]="convNumero() ? convNumero() + ' — Entrevista Personal' : 'Entrevista Personal'"
        subtitle="E27 · RF-13 · Puntaje por miembro del comité · Quórum > 50%">
        <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
           class="btn-ghost text-sm">← Postulantes</a>
      </app-page-header>

      <!-- Banner quórum -->
      @if (!loading() && miembros().length > 0) {
        <div class="card py-3 px-4 flex flex-wrap items-center gap-4 border-l-4"
             [class]="quorumOk() ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'">
          <div>
            <p class="text-xs font-semibold"
               [class]="quorumOk() ? 'text-green-800' : 'text-amber-800'">
              Quórum del Comité — RF-13
            </p>
            <p class="text-xs mt-0.5"
               [class]="quorumOk() ? 'text-green-700' : 'text-amber-700'">
              {{ miembros().length }} miembro(s) registrado(s) ·
              Quórum mínimo requerido: {{ quorumMinimo() }}
            </p>
          </div>
          @if (quorumOk()) {
            <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
              ✓ Quórum alcanzado
            </span>
          } @else {
            <span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
              ⚠ Quórum insuficiente
            </span>
          }
        </div>
      }

      @if (loading()) {
        <div class="card py-10 text-center text-gray-400">
          <span class="animate-spin inline-block mr-2 text-xl">⟳</span>
          <p class="mt-2 text-sm">Cargando postulantes y comité...</p>
        </div>

      } @else if (miembros().length === 0) {
        <div class="card py-10 text-center space-y-2">
          <p class="text-gray-500 font-medium">No se encontró comité de selección.</p>
          <p class="text-xs text-gray-400">
            El comité debe estar registrado para esta convocatoria (E11 — ROL: ORH).
          </p>
        </div>

      } @else if (!soloOrh() && entradas().length === 0) {
        <div class="card py-10 text-center space-y-2">
          <p class="text-gray-500 font-medium">
            No hay postulantes en estado APTO para entrevistar.
          </p>
          <p class="text-xs text-gray-400">
            La evaluación técnica (E26) debe completarse primero.
          </p>
          <a [routerLink]="['/sistema/seleccion', idConv, 'eval-tecnica']"
             class="btn-secondary text-sm inline-block">← E26 Evaluación Técnica</a>
        </div>

      } @else {

        <!-- ──────────────────────────────────────────────────────────
             ORH: vista de resultados en modo lectura + Publicar E27
             ────────────────────────────────────────────────────────── -->
        @if (soloOrh()) {
          @if (!notificacionEntrevistaEnviada()) {
            <div class="card py-10 text-center space-y-2">
              <p class="text-gray-500 font-medium">En espera de notificación del COMITÉ.</p>
              <p class="text-xs text-gray-400">
                El COMITÉ debe registrar y notificar los resultados de la Entrevista Personal (E27)
                antes de que ORH pueda publicarlos.
              </p>
            </div>
          } @else {
            <!-- Barra de acción ORH -->
            <div class="card border p-3 flex flex-wrap items-center gap-3"
                 [class]="entrevistaPublicada()
                   ? 'border-green-200 bg-green-50'
                   : 'border-blue-200 bg-blue-50'">
              @if (!entrevistaPublicada()) {
                <button
                  (click)="publicarResultados()"
                  [disabled]="publicando()"
                  class="btn-primary text-sm disabled:opacity-50"
                >
                  {{ publicando() ? '⟳ Publicando...' : '📢 Publicar Resultados Entrevista' }}
                </button>
              } @else {
                <span class="text-xs text-green-700 font-semibold bg-green-100 px-3 py-1.5 rounded">
                  ✓ Resultados de entrevista publicados
                </span>
                <a [routerLink]="['/sistema/seleccion', idConv, 'bonificaciones']"
                   class="btn-primary text-sm inline-block">
                  Continuar → Bonificaciones
                </a>
              }
              <button
                (click)="descargarPdf()"
                [disabled]="descargando()"
                class="btn-secondary text-sm disabled:opacity-50"
              >
                {{ descargando() ? '⟳ Descargando...' : '📄 Descargar PDF' }}
              </button>
            </div>

            <!-- Resumen -->
            <div class="card flex flex-wrap gap-4 text-sm text-gray-600">
              <span>Total entrevistados: <strong>{{ postulantesOrh().length }}</strong></span>
              <span>Puntaje máximo: <strong>{{ puntajeMaxDinamico() }} pts</strong></span>
              <span>Umbral mínimo: <strong>{{ umbralDinamico() }} pts</strong></span>
            </div>

            <!-- Resultados por postulante — tabla simple (puntajeEntrevista real del backend) -->
            <div class="card overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-[#1F2133] text-white">
                    <th class="px-3 py-2 text-left text-xs font-semibold">#</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold">Apellidos y Nombres</th>
                    <th class="px-3 py-2 text-center text-xs font-semibold">
                      Puntaje Entrevista / {{ puntajeMaxDinamico() }}
                    </th>
                    <th class="px-3 py-2 text-center text-xs font-semibold">Estado</th>
                    <th class="px-3 py-2 text-center text-xs font-semibold">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of postulantesOrh(); track p.idPostulacion; let i = $index) {
                    <tr class="border-t hover:bg-gray-50">
                      <td class="px-3 py-2 text-gray-400 text-xs">{{ i + 1 }}</td>
                      <td class="px-3 py-2 font-medium text-sm">
                        {{ p.postulante.nombreCompleto }}
                      </td>
                      <td class="px-3 py-2 text-center">
                        <div class="flex items-center gap-2 justify-center">
                          <div class="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              class="h-full rounded-full"
                              [style.width.%]="((p.puntajeEntrevista ?? 0) / puntajeMaxDinamico()) * 100"
                              [class]="(p.puntajeEntrevista ?? 0) >= umbralDinamico()
                                ? 'bg-green-500' : 'bg-red-400'"
                            ></div>
                          </div>
                          <span class="font-semibold text-sm"
                                [class]="(p.puntajeEntrevista ?? 0) >= umbralDinamico()
                                  ? 'text-green-700' : 'text-red-600'">
                            {{ p.puntajeEntrevista != null
                               ? (p.puntajeEntrevista | number:'1.2-2')
                               : '—' }}
                          </span>
                        </div>
                      </td>
                      <td class="px-3 py-2 text-center">
                        <span class="text-xs px-2 py-0.5 rounded font-semibold"
                              [class]="p.estado === 'APTO' || p.estado === 'GANADOR' || p.estado === 'ACCESITARIO'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-600'">
                          {{ p.estado }}
                        </span>
                      </td>
                      <td class="px-3 py-2 text-center text-xs">
                        <span [class]="(p.puntajeEntrevista ?? 0) >= umbralDinamico()
                          ? 'text-green-600 font-semibold' : 'text-red-500'">
                          {{ (p.puntajeEntrevista ?? 0) >= umbralDinamico() ? '✓ Aprueba' : '✗ No aprueba' }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

        } @else {

        <!-- ──────────────────────────────────────────────────────────
             COMITÉ / ADMIN: formulario de registro + notificación ORH
             ────────────────────────────────────────────────────────── -->

        <!-- Aviso: evaluación ya registrada previamente -->
        @if (yaRegistradoPrevio() && !resultado()) {
          <div class="card border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
            <span class="text-amber-500 mt-0.5">⚠</span>
            <div>
              <p class="text-sm font-semibold text-amber-700">
                Esta evaluación ya fue registrada previamente.
              </p>
              <p class="text-xs text-amber-600 mt-0.5">
                Los puntajes se pre-cargan de la evaluación anterior.
                Si modifica y guarda, se sobreescribirán los valores registrados.
              </p>
            </div>
          </div>

          <!-- Botones notificar ORH + descargar PDF al re-ingresar -->
          <div class="card border border-blue-200 bg-blue-50 p-3 flex flex-wrap items-center gap-3">
            @if (!notificacionEntrevistaEnviada()) {
              <button
                (click)="notificarOrh()"
                [disabled]="notificando()"
                class="btn-primary text-sm disabled:opacity-50"
              >
                {{ notificando() ? '⟳ Notificando...' : '📨 Notificar a ORH los Resultados' }}
              </button>
            } @else {
              <span class="text-xs text-green-700 font-semibold bg-green-100 px-3 py-1.5 rounded">
                ✓ ORH notificado — en espera de Bonificaciones (E28)
              </span>
            }
            <button
              (click)="descargarPdf()"
              [disabled]="descargando()"
              class="btn-secondary text-sm disabled:opacity-50"
            >
              {{ descargando() ? '⟳ Descargando...' : '📄 Descargar PDF' }}
            </button>
          </div>
        }

        <!-- Resultado tras envío -->
        @if (resultado()) {
          <div class="card border border-green-300 bg-green-50 p-4 space-y-3">
            <p class="font-semibold text-green-700 text-sm">
              ✓ Entrevistas registradas — {{ resultado()!.mensaje }}
            </p>
            <div class="flex flex-wrap gap-6 text-sm">
              <div>Entrevistados: <strong>{{ resultado()!.totalEntrevistados }}</strong></div>
              <div [class]="resultado()!.quorumGlobal ? 'text-green-700' : 'text-red-600'">
                Quórum global:
                <strong>{{ resultado()!.quorumGlobal ? '✓ Alcanzado' : '✗ No alcanzado' }}</strong>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3 pt-1">
              @if (!notificacionEntrevistaEnviada()) {
                <button
                  (click)="notificarOrh()"
                  [disabled]="notificando()"
                  class="btn-primary text-sm disabled:opacity-50"
                >
                  {{ notificando() ? '⟳ Notificando...' : '📨 Notificar a ORH los Resultados' }}
                </button>
              } @else {
                <span class="text-xs text-green-700 font-semibold bg-green-100 px-3 py-1.5 rounded">
                  ✓ ORH notificado — en espera de Bonificaciones (E28)
                </span>
              }
              <button
                (click)="descargarPdf()"
                [disabled]="descargando()"
                class="btn-secondary text-sm disabled:opacity-50"
              >
                {{ descargando() ? '⟳ Descargando...' : '📄 Descargar PDF' }}
              </button>
              @if (notificacionEntrevistaEnviada()) {
                <a [routerLink]="['/sistema/seleccion', idConv, 'bonificaciones']"
                   class="btn-secondary text-sm inline-block">
                  Continuar → E28 Bonificaciones
                </a>
              }
            </div>
          </div>
        }

        <!-- Resumen pre-envío -->
        @if (!resultado()) {
          <div class="card flex flex-wrap gap-4 text-sm text-gray-600">
            <span>Total: <strong>{{ entradas().length }}</strong></span>
            <span>Completados: <strong>{{ completadosCount() }}</strong></span>
            @if (completadosCount() < entradas().length) {
              <span class="text-amber-600">
                Pendientes: <strong>{{ entradas().length - completadosCount() }}</strong>
              </span>
            }
          </div>
        }

        <!-- Cards por postulante -->
        @for (e of entradas(); track e.idPostulacion; let i = $index) {
          <div class="card space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-sm text-[#1F2133]">
                {{ i + 1 }}. {{ e.nombre }}
              </h3>
              <div class="text-xs text-gray-500">
                Promedio: <strong>{{ promedioEntrada(e) | number:'1.2-2' }} pts</strong>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr class="bg-gray-100">
                    <th class="px-3 py-1 text-left font-semibold">Miembro del Comité</th>
                    <th class="px-3 py-1 text-left text-gray-400 font-normal">Cargo/Rol</th>
                    <th class="px-3 py-1 text-center w-32">Puntaje (0–{{ puntajeMaxDinamico() }})</th>
                    <th class="px-3 py-1 text-left">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of e.puntajes; track m.idMiembroComite) {
                    <tr class="border-t hover:bg-gray-50">
                      <td class="px-3 py-1.5 font-medium">{{ m.nombre }}</td>
                      <td class="px-3 py-1.5 text-gray-400">{{ rolMiembro(m.idMiembroComite) }}</td>
                      <td class="px-3 py-1.5 text-center">
                        <input
                          type="number"
                          [(ngModel)]="m.puntaje"
                          min="0"
                          [attr.max]="puntajeMaxDinamico()"
                          step="0.5"
                          class="w-24 text-center border rounded px-1 py-0.5
                                 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          [class]="m.puntaje > puntajeMaxDinamico()
                            ? 'border-red-400 bg-red-50'
                            : m.puntaje > 0
                            ? 'border-green-400'
                            : 'border-gray-300'"
                          [attr.aria-label]="'Puntaje entrevista de ' + m.nombre + ' para ' + e.nombre"
                        />
                      </td>
                      <td class="px-3 py-1.5">
                        <input
                          type="text"
                          [(ngModel)]="m.observacion"
                          class="w-full border border-gray-300 rounded px-2 py-0.5
                                 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                          placeholder="Observación..."
                          [attr.aria-label]="'Observación de ' + m.nombre"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Barra de promedio -->
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <div class="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  [style.width.%]="promedioEntrada(e)"
                  [class]="promedioEntrada(e) >= umbralDinamico()
                    ? 'bg-green-500'
                    : promedioEntrada(e) >= umbralDinamico() * 0.6
                    ? 'bg-amber-500'
                    : 'bg-red-400'"
                ></div>
              </div>
              <span class="font-semibold"
                    [class]="promedioEntrada(e) >= umbralDinamico() ? 'text-green-700' : 'text-gray-600'">
                {{ promedioEntrada(e) | number:'1.1-1' }} / {{ puntajeMaxDinamico() }}
              </span>
            </div>
          </div>
        }

        @if (hayPuntajeInvalido()) {
          <div class="card border border-red-300 bg-red-50 p-3 text-xs text-red-700">
            ⚠ Hay puntajes que superan {{ puntajeMaxDinamico() }}. Corrija antes de guardar.
          </div>
        }

        <!-- Acciones -->
        @if (!resultado()) {
          <div class="flex gap-2 justify-end flex-wrap">
            <a [routerLink]="['/sistema/seleccion', idConv, 'eval-tecnica']"
               class="btn-ghost text-sm">← Evaluación Técnica</a>
            <button
              (click)="registrar()"
              [disabled]="enviando() || !quorumOk() || hayPuntajeInvalido()"
              class="btn-primary disabled:opacity-50"
              [title]="!quorumOk() ? 'Quórum insuficiente para registrar entrevistas' : ''"
            >
              {{ enviando()
                ? '⟳ Registrando...'
                : yaRegistradoPrevio()
                ? 'Actualizar Entrevistas (E27)'
                : 'Registrar Entrevistas (E27)' }}
            </button>
          </div>
          @if (!quorumOk()) {
            <p class="text-xs text-amber-600 text-right">
              ⚠ Se requieren al menos {{ quorumMinimo() }} miembro(s) para alcanzar quórum.
            </p>
          }
        }
        } <!-- fin @else COMITÉ -->
      }
    </div>
  `,
})
export class EntrevistaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  readonly loading = signal(true);
  readonly enviando = signal(false);
  readonly publicando = signal(false);
  readonly descargando = signal(false);

  /** ORH puro: puede ver resultados y publicar, pero no registrar/editar (eso es COMITÉ) */
  readonly soloOrh = computed(() =>
    this.auth.hasRole('ROLE_ORH') &&
    !this.auth.hasRole('ROLE_COMITE') &&
    !this.auth.hasRole('ROLE_ADMIN'),
  );
  readonly entradas = signal<EntradaEntrevista[]>([]);
  /** Postulantes para vista ORH (todos con puntajeEntrevista, sin importar estado actual) */
  readonly postulantesOrh = signal<PostulacionSeleccion[]>([]);
  readonly miembros = signal<MiembroComiteItem[]>([]);
  readonly resultado = signal<EntrevistaResponse | null>(null);
  readonly yaRegistradoPrevio = signal(false);
  readonly convNumero = signal('');
  readonly entrevistaPublicada = signal(false);
  readonly notificacionEntrevistaEnviada = signal(false);
  readonly notificando = signal(false);
  /** Puntaje máximo del examen de entrevista — cargado desde TBL_FACTOR_EVALUACION.PUNTAJE_MAXIMO
   *  (factor padre ENTREVISTA). Fallback 100. */
  readonly puntajeMaxDinamico = signal(100);
  /** Umbral mínimo de aprobación entrevista — cargado desde TBL_FACTOR_EVALUACION.PUNTAJE_MINIMO.
   *  Fallback 60. */
  readonly umbralDinamico = signal(60);

  readonly quorumMinimo = computed(() =>
    Math.floor(this.miembros().length / 2) + 1,
  );

  readonly quorumOk = computed(() =>
    this.miembros().length >= this.quorumMinimo(),
  );

  readonly hayPuntajeInvalido = computed(() =>
    this.entradas().some((e) => e.puntajes.some((m) => m.puntaje > this.puntajeMaxDinamico())),
  );

  /** Postulantes con al menos 1 puntaje > 0 ingresado */
  readonly completadosCount = computed(() =>
    this.entradas().filter((e) => e.puntajes.some((m) => m.puntaje > 0)).length,
  );

  constructor() {
    this.cargar();
    this.cargarConvocatoria();
    this.cargarFactores();
  }

  /**
   * FIX BUG-2: promedio incluye todos los miembros (incluso puntaje 0 legítimo).
   * Se calcula sobre el total de miembros del comité, no solo los que ingresaron > 0.
   */
  promedioEntrada(e: EntradaEntrevista): number {
    if (e.puntajes.length === 0) return 0;
    const suma = e.puntajes.reduce((acc, m) => acc + Number(m.puntaje), 0);
    return suma / e.puntajes.length;
  }

  rolMiembro(idMiembro: number): string {
    return this.miembros().find((m) => m.idMiembroComite === idMiembro)?.rolComite ?? '—';
  }

  /** Carga el factor padre ENTREVISTA para obtener puntajeMaximo y puntajeMinimo dinámicos.
   *  Mismo patrón que eval-tecnica.component.ts. Si falla, usa defaults (100 / 60). */
  private cargarFactores(): void {
    this.svc
      .listarFactores(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (factores: FactorDetalle[]) => {
          const padreEntrevista = factores.find(
            (f) => f.etapaEvaluacion === 'ENTREVISTA' && f.idFactorPadre == null,
          );
          if (!padreEntrevista) return;
          if (padreEntrevista.puntajeMaximo > 0)
            this.puntajeMaxDinamico.set(padreEntrevista.puntajeMaximo);
          if (padreEntrevista.puntajeMinimo > 0)
            this.umbralDinamico.set(padreEntrevista.puntajeMinimo);
          else if (padreEntrevista.puntajeMaximo > 0)
            this.umbralDinamico.set(
              Math.round(padreEntrevista.puntajeMaximo * 0.6 * 100) / 100,
            );
        },
        error: () => { /* no bloquea — se usan valores default 100/60 */ },
      });
  }

  private cargarConvocatoria(): void {
    this.svc
      .obtenerConvocatoria(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conv) => {
          this.convNumero.set(conv.numeroConvocatoria ?? '');
          this.entrevistaPublicada.set(conv.entrevistaPublicada ?? false);
          this.notificacionEntrevistaEnviada.set(conv.notificacionEntrevistaEnviada ?? false);
        },
        error: () => { /* fallback — no bloquea la pantalla */ },
      });
  }

  private cargar(): void {
    forkJoin({
      postulantes: this.svc.listarPostulantes(this.idConv, 0, 200),
      comite: this.svc.obtenerComite(this.idConv),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ postulantes, comite }) => {
          const miembros = comite?.miembros ?? [];
          this.miembros.set(miembros);

          if (this.soloOrh()) {
            // ORH: carga todos los postulantes con puntaje de entrevista registrado,
            // independientemente del estado actual (puede ser GANADOR, NO_APTO, etc.)
            this.postulantesOrh.set(
              postulantes.content.filter(
                (p: PostulacionSeleccion) => p.puntajeEntrevista != null,
              ),
            );
          } else {
            // COMITÉ: solo APTO para registrar/actualizar entrevistas
            const aptos = postulantes.content.filter(
              (p: PostulacionSeleccion) => p.estado === 'APTO',
            );
            const todosYaRegistrados =
              aptos.length > 0 &&
              aptos.every((p: PostulacionSeleccion) => p.puntajeEntrevista != null);
            this.yaRegistradoPrevio.set(todosYaRegistrados);
            this.entradas.set(
              aptos.map((p: PostulacionSeleccion) => ({
                idPostulacion: p.idPostulacion,
                nombre: p.postulante.nombreCompleto,
                puntajes: miembros.map((m: MiembroComiteItem) => ({
                  idMiembroComite: m.idMiembroComite,
                  nombre: m.nombresCompletos,
                  puntaje: p.puntajeEntrevista != null ? Number(p.puntajeEntrevista) : 0,
                  observacion: '',
                })),
              })),
            );
          }
          this.loading.set(false);
        },
        error: () => {
          this.toast.error('No se pudo cargar los datos de entrevista.');
          this.loading.set(false);
        },
      });
  }

  registrar(): void {
    if (this.enviando()) return;
    this.enviando.set(true);

    this.svc
      .entrevistas(this.idConv, {
        entrevistas: this.entradas().map((e) => ({
          idPostulacion: e.idPostulacion,
          puntajesMiembros: e.puntajes.map((m) => ({
            idMiembroComite: m.idMiembroComite,
            puntaje: Number(m.puntaje),
            observacion: m.observacion || undefined,
          })),
        })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.resultado.set(res);
          this.yaRegistradoPrevio.set(false);
          this.toast.success(res.mensaje);
          this.enviando.set(false);
        },
        error: (err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message ?? 'Error al registrar entrevistas.');
          this.enviando.set(false);
        },
      });
  }

  /** E27-PUBLICAR — ORH publica los resultados de entrevista + descarga PDF */
  protected publicarResultados(): void {
    if (this.publicando()) return;
    this.publicando.set(true);
    this.svc
      .publicarResultadosEntrevista(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.descargarBlob(blob, `RESULT-ENTREVISTA-${this.convNumero() || this.idConv}.pdf`);
          this.publicando.set(false);
          this.entrevistaPublicada.set(true);
          this.toast.success('Resultados de entrevista publicados. PDF descargado.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.publicando.set(false);
          this.toast.error(err?.error?.message ?? 'Error al publicar los resultados.');
        },
      });
  }

  protected notificarOrh(): void {
    if (this.notificando()) return;
    this.notificando.set(true);
    this.svc
      .notificarEntrevistaOrh(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.notificando.set(false);
          this.notificacionEntrevistaEnviada.set(true);
          this.toast.success(res.mensaje ?? 'ORH notificado. Puede proceder con las Bonificaciones.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.notificando.set(false);
          this.toast.error(err?.error?.message ?? 'Error al notificar a ORH.');
        },
      });
  }

  protected descargarPdf(): void {
    if (this.descargando()) return;
    this.descargando.set(true);
    this.svc
      .resultadosEntrevistaPdf(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.descargarBlob(blob, `RESULT-ENTREVISTA-${this.convNumero() || this.idConv}.pdf`);
          this.descargando.set(false);
        },
        error: () => {
          this.descargando.set(false);
          this.toast.error('Error al descargar el PDF.');
        },
      });
  }

  private descargarBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
