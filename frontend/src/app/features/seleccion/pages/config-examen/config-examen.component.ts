import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  BancoPreguntaEstadoResponse,
  ConfigExamenResponse,
  ResultadoConsolidado,
} from '../../models/seleccion.model';

@Component({
  selector: 'app-config-examen',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeaderComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Configuraci\u00f3n del Examen Virtual"
        subtitle="E26-V \u00b7 ORH configura fecha, ventana horaria y cantidad de preguntas (duraci\u00f3n autom\u00e1tica)">
        <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
           class="btn-ghost text-sm">\u2190 Postulantes</a>
      </app-page-header>

      <div class="card p-4">
        <h3 class="text-sm font-semibold text-gray-700 mb-2">Estado del Banco de Preguntas</h3>
        @if (banco()) {
          <div class="flex flex-wrap gap-4 text-sm">
            <span [class]="banco()!.cargado ? 'text-green-600' : 'text-red-600'">
              {{ banco()!.cargado ? '\u2713 Cargado' : '\u2717 No cargado' }}
            </span>
            @if (banco()!.cargado) {
              <span class="text-gray-500">
                {{ banco()!.totalPreguntas }} preguntas \u2014
                por {{ banco()!.usuarioCarga }}
              </span>
              @if (banco()!.fechaCarga) {
                <span class="text-gray-500 block mt-1 text-xs">
                  Fecha de carga: {{ banco()!.fechaCarga }}
                </span>
              }
            }
          </div>
        } @else {
          <p class="text-sm text-gray-400">Cargando estado...</p>
        }
      </div>

      @if (banco()?.puntajeMinimoTecnica != null && banco()?.puntajeMaximoTecnica != null) {
        <div class="card p-4 border border-gray-200 bg-gray-50/80">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Evaluaci\u00f3n t\u00e9cnica (convocatoria)</h3>
          <p class="text-sm text-gray-600">
            Puntaje m\u00ednimo: <strong>{{ banco()!.puntajeMinimoTecnica }}</strong>
            \u2014 Puntaje m\u00e1ximo: <strong>{{ banco()!.puntajeMaximoTecnica }}</strong>
          </p>
          @if (banco()?.fechaInicioCronogramaTecnica) {
            <p class="text-xs text-gray-500 mt-2">
              Cronograma evaluaci\u00f3n t\u00e9cnica (E10):
              {{ banco()!.fechaInicioCronogramaTecnica }}
              al {{ banco()!.fechaFinCronogramaTecnica }}
            </p>
          } @else {
            <p class="text-xs text-amber-600 mt-2">
              No hay actividad EVAL_TECNICA en el cronograma; la fecha del examen solo valida contra \u201choy\u201d.
            </p>
          }
          <p class="text-xs text-gray-500 mt-2 leading-relaxed">
            El puntaje obtenido en el examen se convierte a la misma escala que el factor de evaluaci\u00f3n t\u00e9cnica (E12).
            Si el postulante responde correctamente todas las preguntas de su examen, el puntaje normalizado coincide con el puntaje m\u00e1ximo de fase indicado arriba.
          </p>
          <p class="text-xs text-gray-500 mt-2 leading-relaxed border-t border-gray-200/80 pt-2">
            El puntaje de cada \u00edtem del banco lo registr\u00f3 el \u00e1rea usuaria al cargar las preguntas (m\u00edn. 1 punto por pregunta). ORH no altera ese banco; aqu\u00ed solo configura cu\u00e1ntas preguntas se muestran, fechas y duraci\u00f3n del examen.
          </p>
        </div>
      }

      @if (config()?.notificacionEnviada && config()!.postulantesNotificados != null
          && config()!.postulantesNotificados! > 0) {
        <div class="card border border-emerald-200 bg-emerald-50/90 p-4">
          <p class="text-sm font-semibold text-emerald-900">
            Examen enviado a {{ config()!.postulantesNotificados }} postulante(s) APTO
            @if (config()!.numeroConvocatoria) {
              <span> de la convocatoria <strong>{{ config()!.numeroConvocatoria }}</strong></span>
            }
          </p>
          <p class="text-xs text-emerald-800 mt-1">
            Los postulantes fueron notificados para rendir el examen en el horario configurado.
          </p>
        </div>
      }

      @if (config() && config()!.estado === 'CONFIGURADO' && !editandoParametros()) {
        <div class="card border border-amber-200 bg-amber-50/80 p-4 space-y-3">
          <p class="text-sm font-semibold text-amber-900">Par\u00e1metros guardados (pendiente de publicar)</p>
          <div class="flex flex-wrap gap-4 text-sm text-gray-700">
            <span>Preguntas: <strong>{{ config()!.cantidadPreguntas }}</strong></span>
            <span>Inicio: <strong>{{ formatFechaHora(asIso(config()!.fechaHoraInicio)) }}</strong></span>
            <span>Fin: <strong>{{ formatFechaHora(asIso(config()!.fechaHoraFin)) }}</strong></span>
            <span>Duraci\u00f3n: <strong>{{ config()!.duracionMinutos }} min</strong></span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" (click)="editandoParametros.set(true); cdr.markForCheck()"
                    class="btn-secondary text-sm">
              Editar par\u00e1metros
            </button>
            <button type="button" (click)="publicar()"
                    [disabled]="publicando()"
                    class="btn-primary text-sm disabled:opacity-50">
              {{ publicando() ? '\u27f3 Publicando...' : 'Publicar examen' }}
            </button>
          </div>
        </div>
      }

      @if (config() && config()!.estado !== 'CONFIGURADO') {
        <div class="card border border-blue-200 bg-blue-50 p-4 space-y-3">
          <p class="text-sm font-semibold text-blue-700">
            Examen en estado: {{ config()!.estado }}
          </p>
          <div class="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>Preguntas: <strong>{{ config()!.cantidadPreguntas }}</strong></span>
            <span>Inicio: <strong>{{ formatFechaHora(asIso(config()!.fechaHoraInicio)) }}</strong></span>
            <span>Fin: <strong>{{ formatFechaHora(asIso(config()!.fechaHoraFin)) }}</strong></span>
            <span>Duraci\u00f3n: <strong>{{ config()!.duracionMinutos }} min</strong></span>
          </div>
          @if (config()!.puntajeMinimoTecnica != null) {
            <p class="text-xs text-gray-500">
              Referencia t\u00e9cnica (E12): m\u00edn. {{ config()!.puntajeMinimoTecnica }} / m\u00e1x.
              {{ config()!.puntajeMaximoTecnica }}
            </p>
          }

          @if (config()!.estado === 'PUBLICADO' && !config()!.notificacionEnviada) {
            <button
              (click)="notificar()"
              [disabled]="notificando()"
              class="btn-primary text-sm disabled:opacity-50"
            >
              {{ notificando() ? '\u27f3 Notificando...' : 'Notificar postulantes' }}
            </button>
          }

          <a [routerLink]="['/sistema/seleccion', idConv, 'examen-resultados']"
             class="btn-secondary text-sm inline-block">
            PDF / publicaci\u00f3n E26
          </a>
        </div>
      }

      @if (!config() || (config()!.estado === 'CONFIGURADO' && editandoParametros())) {
        <div class="card p-5 space-y-5">
          <h3 class="text-sm font-semibold text-gray-700 border-b pb-2">Par\u00e1metros del Examen</h3>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha del Examen</label>
            <input type="date" [(ngModel)]="fechaExamen"
                   (ngModelChange)="onFormInput()"
                   [min]="fechaMinPermitida()"
                   [attr.max]="fechaMaxCronograma() || null"
                   class="input w-full sm:w-60 text-sm" />
            @if (fechaExamen && !fechaValidaCronograma()) {
              <p class="text-xs text-red-600 mt-1">
                La fecha debe estar dentro del cronograma de evaluaci\u00f3n t\u00e9cnica (E10).
              </p>
            }
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Hora Inicio</label>
              <div class="flex items-center gap-2">
                <input type="time" [(ngModel)]="horaInicio"
                       (ngModelChange)="onFormInput()"
                       class="input flex-1 text-sm" />
                <span class="text-xs text-gray-400 w-8">{{ amPm(horaInicio) }}</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Hora Fin</label>
              <div class="flex items-center gap-2">
                <input type="time" [(ngModel)]="horaFin"
                       (ngModelChange)="onFormInput()"
                       class="input flex-1 text-sm" />
                <span class="text-xs text-gray-400 w-8">{{ amPm(horaFin) }}</span>
              </div>
            </div>
          </div>
          @if (horaInicio && horaFin && !horarioValido()) {
            <p class="text-xs text-red-600 -mt-2">
              La hora de fin debe ser posterior a la de inicio (mismo d\u00eda).
            </p>
          }

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Preguntas a mostrar</label>
              <input type="number" [(ngModel)]="cantPreguntas" min="1" max="30"
                     (keydown)="bloquearSignos($event)"
                     class="input w-full sm:w-40 text-sm" />
              <span class="text-[10px] text-gray-400 mt-0.5 block">M\u00e1x. {{ banco()?.totalPreguntas ?? 30 }} del banco</span>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Duraci\u00f3n (minutos)</label>
              <input
                type="number"
                class="input w-full sm:w-40 text-sm bg-gray-50 text-gray-800 cursor-default tabular-nums"
                [value]="duracionDesdeVentana() > 0 ? duracionDesdeVentana() : ''"
                readonly
                tabindex="-1"
                title="Calculada autom\u00e1ticamente entre hora inicio y fin"
              />
              <span class="text-[10px] text-gray-400 mt-0.5 block">
                Calculada entre hora inicio y fin (5\u2013180 min).
              </span>
            </div>
          </div>
          @if (horaInicio && horaFin && horarioValido() && !duracionVentanaOkParaGuardar()) {
            <p class="text-xs text-red-600">
              La ventana debe durar entre 5 y 180 minutos (actual: {{ duracionDesdeVentana() }} min).
            </p>
          }

        </div>

        <div class="flex gap-3 justify-end flex-wrap">
          @if (config()?.estado === 'CONFIGURADO' && editandoParametros()) {
            <button type="button" (click)="cancelarEdicion()"
                    class="btn-ghost text-sm">
              Cancelar edici\u00f3n
            </button>
          }
          <button
            (click)="guardarConfig()"
            [disabled]="guardando() || !banco()?.cargado || !fechaExamen || !horaInicio || !horaFin
              || !horarioValido() || !duracionVentanaOkParaGuardar()
              || !fechaValidaCronograma() || !coherenciaFactoresOk()"
            class="btn-secondary disabled:opacity-50"
          >
            {{ guardando() ? '\u27f3 Guardando...' : 'Guardar Configuraci\u00f3n' }}
          </button>
          @if (!config() || config()!.estado === 'CONFIGURADO') {
            <button
              (click)="publicar()"
              [disabled]="publicando() || !config()"
              class="btn-primary disabled:opacity-50"
            >
              {{ publicando() ? '\u27f3 Publicando...' : 'Publicar Examen' }}
            </button>
          }
        </div>
      }

      @if (config()) {
        <div class="card p-4 space-y-3">
          <h3 class="text-sm font-semibold text-gray-800 border-b pb-2">
            Seguimiento \u2014 postulantes APTO y examen virtual
          </h3>
          @if (cargandoResultados()) {
            <p class="text-sm text-gray-400">Cargando tabla...</p>
          } @else if (resultados().length === 0) {
            <p class="text-sm text-gray-500">No hay postulantes en estado APTO para esta convocatoria.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-100 text-left">
                    <th class="px-3 py-2 text-xs font-semibold">#</th>
                    <th class="px-3 py-2 text-xs font-semibold">Postulante</th>
                    <th class="px-3 py-2 text-xs font-semibold text-center">C\u00f3d. an\u00f3nimo</th>
                    <th class="px-3 py-2 text-xs font-semibold text-center">Estado examen</th>
                    <th class="px-3 py-2 text-xs font-semibold text-center">Correctas</th>
                    <th class="px-3 py-2 text-xs font-semibold text-center">Puntaje examen</th>
                    <th class="px-3 py-2 text-xs font-semibold text-center">Nota t\u00e9cnica (E12)</th>
                    <th class="px-3 py-2 text-xs font-semibold text-center">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of resultados(); track r.idPostulacion; let i = $index) {
                    <tr class="border-t border-gray-100">
                      <td class="px-3 py-2 text-xs text-gray-400">{{ i + 1 }}</td>
                      <td class="px-3 py-2">{{ r.nombrePostulante }}</td>
                      <td class="px-3 py-2 text-center font-mono text-xs">{{ r.codigoAnonimo ?? '\u2014' }}</td>
                      <td class="px-3 py-2 text-center text-xs">{{ etiquetaEstadoExamen(r.estadoExamen) }}</td>
                      <td class="px-3 py-2 text-center text-xs">{{ r.totalCorrectas ?? '\u2014' }} / {{ r.totalPreguntas ?? '\u2014' }}</td>
                      <td class="px-3 py-2 text-center tabular-nums">
                        {{ r.puntajeTotal != null ? (r.puntajeTotal | number:'1.2-2') : '\u2014' }}
                      </td>
                      <td class="px-3 py-2 text-center tabular-nums">
                        {{ r.puntajeTecnicaEscala != null ? (r.puntajeTecnicaEscala | number:'1.2-2') : '\u2014' }}
                      </td>
                      <td class="px-3 py-2 text-center">
                        <span class="text-xs font-semibold px-2 py-0.5 rounded"
                              [class.bg-green-100]="r.resultadoTecnica === 'APTO'"
                              [class.text-green-800]="r.resultadoTecnica === 'APTO'"
                              [class.bg-red-100]="r.resultadoTecnica === 'NO_APTO'"
                              [class.text-red-800]="r.resultadoTecnica === 'NO_APTO'"
                              [class.bg-gray-100]="r.resultadoTecnica === 'PENDIENTE'"
                              [class.text-gray-600]="r.resultadoTecnica === 'PENDIENTE'">
                          {{ r.resultadoTecnica ?? 'PENDIENTE' }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ConfigExamenComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly cdr = inject(ChangeDetectorRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly banco = signal<BancoPreguntaEstadoResponse | null>(null);
  protected readonly config = signal<ConfigExamenResponse | null>(null);
  protected readonly resultados = signal<ResultadoConsolidado[]>([]);
  protected readonly cargandoResultados = signal(false);
  protected readonly editandoParametros = signal(false);
  protected readonly guardando = signal(false);
  protected readonly publicando = signal(false);
  protected readonly notificando = signal(false);

  protected fechaExamen = '';
  protected horaInicio = '';
  protected horaFin = '';
  protected cantPreguntas = 10;
  protected readonly hoy = new Date().toISOString().substring(0, 10);

  protected amPm(hora: string): string {
    if (!hora) return '';
    const h = parseInt(hora.split(':')[0], 10);
    return h < 12 ? 'a.m.' : 'p.m.';
  }

  protected bloquearSignos(event: KeyboardEvent): void {
    if (['+', '-', 'e', 'E'].includes(event.key)) {
      event.preventDefault();
    }
  }

  protected formatFechaHora(iso: string): string {
    if (!iso) return '—';
    const fecha = iso.substring(0, 10);
    const hora = iso.substring(11, 16);
    const h = parseInt(hora.split(':')[0], 10);
    const m = hora.split(':')[1];
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const periodo = h < 12 ? 'a.m.' : 'p.m.';
    return `${fecha} ${h12}:${m} ${periodo}`;
  }

  /** ISO string desde backend (LocalDateTime serializado). */
  protected asIso(v: string | undefined): string {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return String(v);
  }

  protected etiquetaEstadoExamen(raw: string): string {
    const m: Record<string, string> = {
      SIN_INICIAR: 'Sin iniciar',
      PENDIENTE: 'Pendiente',
      EN_CURSO: 'En curso',
      FINALIZADO: 'Finalizado',
      EXPIRADO: 'Cerrado (tiempo)',
    };
    return m[raw] ?? raw;
  }

  protected onFormInput(): void {
    this.cdr.markForCheck();
  }

  protected fechaMinPermitida(): string {
    const b = this.banco();
    if (b?.fechaInicioCronogramaTecnica) {
      return this.hoy > b.fechaInicioCronogramaTecnica ? this.hoy : b.fechaInicioCronogramaTecnica;
    }
    return this.hoy;
  }

  protected fechaMaxCronograma(): string | null {
    return this.banco()?.fechaFinCronogramaTecnica ?? null;
  }

  protected horarioValido(): boolean {
    if (!this.horaInicio || !this.horaFin) return false;
    const [h1, m1] = this.horaInicio.split(':').map(Number);
    const [h2, m2] = this.horaFin.split(':').map(Number);
    return h2 * 60 + m2 > h1 * 60 + m1;
  }

  /** Minutos entre hora fin e inicio (mismo d\u00eda). */
  protected duracionDesdeVentana(): number {
    if (!this.horaInicio || !this.horaFin || !this.horarioValido()) return 0;
    const [h1, m1] = this.horaInicio.split(':').map(Number);
    const [h2, m2] = this.horaFin.split(':').map(Number);
    return h2 * 60 + m2 - (h1 * 60 + m1);
  }

  protected duracionVentanaOkParaGuardar(): boolean {
    const d = this.duracionDesdeVentana();
    return d >= 5 && d <= 180;
  }

  protected fechaValidaCronograma(): boolean {
    const b = this.banco();
    if (!b?.fechaInicioCronogramaTecnica && !b?.fechaFinCronogramaTecnica) {
      return true;
    }
    if (!this.fechaExamen) return true;
    const ini = b.fechaInicioCronogramaTecnica;
    const fin = b.fechaFinCronogramaTecnica;
    if (ini && this.fechaExamen < ini) return false;
    if (fin && this.fechaExamen > fin) return false;
    return true;
  }

  protected coherenciaFactoresOk(): boolean {
    const b = this.banco();
    if (b?.puntajeMinimoTecnica == null || b?.puntajeMaximoTecnica == null) return true;
    return b.puntajeMinimoTecnica <= b.puntajeMaximoTecnica;
  }

  constructor() {
    this.cargarEstado();
  }

  private cargarEstado(): void {
    this.svc.estadoBancoPreguntas(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (b) => this.banco.set(b) });

    this.svc.obtenerConfigExamen(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => this.aplicarConfig(c),
        error: (err: { status?: number }) => {
          this.config.set(null);
          this.resultados.set([]);
          if (err?.status === 404) {
            this.toast.info('A\u00fan no hay configuraci\u00f3n del examen. Complete los par\u00e1metros y guarde.');
          } else {
            this.toast.error('No se pudo cargar la configuraci\u00f3n del examen.');
          }
          this.cdr.markForCheck();
        },
      });
  }

  private aplicarConfig(c: ConfigExamenResponse): void {
    this.config.set(c);
    this.patchFormFromConfig(c);
    this.editandoParametros.set(false);
    this.refrescarResultados();
    this.cdr.markForCheck();
  }

  private patchFormFromConfig(c: ConfigExamenResponse): void {
    const ini = this.asIso(c.fechaHoraInicio);
    const fin = this.asIso(c.fechaHoraFin);
    if (ini.length >= 16) {
      this.fechaExamen = ini.substring(0, 10);
      this.horaInicio = ini.substring(11, 16);
    }
    if (fin.length >= 16) {
      this.horaFin = fin.substring(11, 16);
    }
    this.cantPreguntas = c.cantidadPreguntas;
  }

  protected cancelarEdicion(): void {
    const c = this.config();
    if (c) this.patchFormFromConfig(c);
    this.editandoParametros.set(false);
    this.cdr.markForCheck();
  }

  private refrescarResultados(): void {
    this.cargandoResultados.set(true);
    this.svc.resultadosExamen(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.resultados.set(rows);
          this.cargandoResultados.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.resultados.set([]);
          this.cargandoResultados.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  protected guardarConfig(): void {
    this.guardando.set(true);
    const fechaInicio = `${this.fechaExamen}T${this.horaInicio}`;
    const fechaFin = `${this.fechaExamen}T${this.horaFin}`;
    this.svc.configurarExamen(this.idConv, {
      fechaHoraInicio: fechaInicio,
      fechaHoraFin: fechaFin,
      cantidadPreguntas: this.cantPreguntas,
      duracionMinutos: this.duracionDesdeVentana(),
      mostrarResultado: true,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.aplicarConfig(c);
          this.guardando.set(false);
          this.toast.success(c.mensaje ?? 'Configuraci\u00f3n guardada.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.guardando.set(false);
          this.toast.error(err?.error?.message ?? 'Error al configurar examen.');
        },
      });
  }

  protected publicar(): void {
    this.publicando.set(true);
    this.svc.publicarExamen(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.aplicarConfig(c);
          this.publicando.set(false);
          this.toast.success(c.mensaje ?? 'Examen publicado.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.publicando.set(false);
          this.toast.error(err?.error?.message ?? 'Error al publicar examen.');
        },
      });
  }

  protected notificar(): void {
    this.notificando.set(true);
    this.svc.notificarExamen(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.aplicarConfig(c);
          this.notificando.set(false);
          this.toast.success(c.mensaje ?? 'Notificaci\u00f3n enviada.');
        },
        error: (err: { error?: { message?: string } }) => {
          this.notificando.set(false);
          this.toast.error(err?.error?.message ?? 'Error al notificar.');
        },
      });
  }
}
