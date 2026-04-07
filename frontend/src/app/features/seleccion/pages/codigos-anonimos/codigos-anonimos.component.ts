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
import { SeleccionService } from '../../services/seleccion.service';
import { ConvocatoriaService } from '@features/convocatoria/services/convocatoria.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { PostulacionSeleccion } from '../../models/seleccion.model';

@Component({
  selector: 'app-codigos-anonimos',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Asignación de Códigos Anónimos"
        subtitle="E25 · RF-10 · D.L. 1451 — Modo anónimo para evaluación técnica">
        <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
           class="btn-ghost text-sm">← Postulantes</a>
      </app-page-header>

      <!-- Info legal -->
      <div class="card border-l-4 border-purple-500 bg-purple-50 py-3 px-4">
        <p class="text-xs font-semibold text-purple-800 mb-1">
          🔒 D.L. 1451 — Anonimato obligatorio en Evaluación Técnica
        </p>
        <p class="text-xs text-purple-700">
          Este proceso asigna un código aleatorio (ANON-XXXX) a cada postulante APTO.
          A partir de este momento, el Comité evaluará únicamente por código —
          <strong>nunca verá los nombres reales</strong>.
          Esta acción es <strong>irreversible</strong>: los códigos no pueden reasignarse.
          Solo el ROL ORH puede ver la correspondencia código ↔ nombre.
        </p>
      </div>

      <!-- Cargando -->
      @if (loading()) {
        <div class="card py-10 text-center text-gray-400">
          <span class="animate-spin inline-block mr-2">⟳</span> Verificando estado...
        </div>

      } @else if (aptosCount() === 0) {
        <!-- Sin postulantes APTO -->
        <div class="card py-10 text-center space-y-2">
          <p class="text-gray-500 font-medium">No hay postulantes en estado APTO.</p>
          <p class="text-xs text-gray-400">
            Primero complete E24 — Evaluación Curricular (ROL: COMITÉ).
          </p>
          <a [routerLink]="['/sistema/seleccion', idConv, 'eval-curricular']"
             class="btn-secondary text-sm inline-block">← E24 Evaluación Curricular</a>
        </div>

      } @else {
        <!-- Estado: ya asignados o por asignar -->
        @if (yaAsignados()) {
          <!-- Códigos ya existentes -->
          <div class="card space-y-4">
            <div class="bg-green-50 border border-green-200 rounded p-3">
              <p class="text-sm font-semibold text-green-700 mb-1">
                ✓ Códigos anónimos ya asignados — {{ codigosAsignados().length }} postulante(s)
              </p>
              <p class="text-xs text-gray-500">
                Los códigos fueron asignados previamente. La lista es de solo lectura.
              </p>
            </div>

            <table class="w-full text-xs">
              <thead>
                <tr class="bg-[#1F2133] text-white">
                  <th class="px-3 py-2 text-left font-semibold">#</th>
                  <th class="px-3 py-2 text-left font-semibold">Apellidos y Nombres</th>
                  <th class="px-3 py-2 text-center font-semibold">Código Anónimo</th>
                  <th class="px-3 py-2 text-center font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (p of codigosAsignados(); track p.idPostulacion; let i = $index) {
                  <tr class="border-t hover:bg-gray-50">
                    <td class="px-3 py-2 text-gray-400">{{ i + 1 }}</td>
                    <td class="px-3 py-2 font-medium">{{ p.postulante.nombreCompleto }}</td>
                    <td class="px-3 py-2 text-center font-mono font-bold text-[#1F2133]">
                      {{ p.codigoAnonimo }}
                    </td>
                    <td class="px-3 py-2 text-center">
                      <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        APTO
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>

            <!-- Aviso de notificación enviada -->
            @if (notificacionEnviada()) {
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
                <p class="text-sm font-semibold text-blue-700">
                  ✅ Comité notificado exitosamente
                </p>
                <p class="text-xs text-blue-600">
                  {{ mensajeNotificacion() }}
                  El Comité puede proceder con E26 — Evaluación Técnica.
                </p>
              </div>
            }

            <div class="flex gap-2 justify-end items-center">
              <!-- Botón: siempre activo — permite re-enviar si la notificación anterior falló -->
              <button
                (click)="notificar()"
                [disabled]="notificando()"
                [class]="notificacionEnviada()
                  ? 'btn-ghost text-sm disabled:opacity-50'
                  : 'btn-primary disabled:opacity-50'"
              >
                {{ notificando()
                  ? '⟳ Notificando...'
                  : notificacionEnviada()
                  ? '🔁 Re-enviar Notificación al Comité'
                  : '📧 Notificar al Comité — ' + aptosCount() + ' postulante(s) listos' }}
              </button>
            </div>
          </div>

        } @else {
          <!-- Sin códigos aún — pendiente asignar -->
          <div class="card space-y-4">
            <div class="bg-amber-50 border border-amber-200 rounded p-3">
              <p class="text-sm font-semibold text-amber-800 mb-1">
                ⚠ Acción irreversible
              </p>
              <p class="text-xs text-amber-700">
                Al confirmar, se asignará un código único a cada uno de los
                <strong>{{ aptosCount() }} postulante(s) APTO</strong>.
                Los códigos son permanentes y no pueden modificarse ni reasignarse.
              </p>
            </div>

            <!-- Lista de postulantes que recibirán código -->
            <div class="text-xs text-gray-600 space-y-1">
              <p class="font-semibold text-gray-700 mb-2">
                Postulantes que recibirán código:
              </p>
              @for (p of aptos(); track p.idPostulacion; let i = $index) {
                <div class="flex items-center justify-between border-b py-1">
                  <span>{{ i + 1 }}. {{ p.postulante.nombreCompleto }}</span>
                  <span class="text-green-700 font-mono text-xs">APTO → ANON-????</span>
                </div>
              }
            </div>

            <!-- Modal de confirmación inline -->
            @if (mostrarConfirmacion()) {
              <div class="border-2 border-red-300 bg-red-50 rounded-lg p-4 space-y-3">
                <p class="font-semibold text-red-700 text-sm">
                  ¿Confirma la asignación de códigos anónimos?
                </p>
                <p class="text-xs text-red-600">
                  Esta acción asignará códigos ANON-XXXX a {{ aptosCount() }} postulante(s)
                  y no podrá deshacerse. El COMITÉ verá solo los códigos a partir de ahora.
                </p>
                <div class="flex gap-2">
                  <button
                    (click)="mostrarConfirmacion.set(false)"
                    class="btn-ghost text-sm"
                  >Cancelar</button>
                  <button
                    (click)="asignar()"
                    [disabled]="asignando()"
                    class="bg-red-600 hover:bg-red-700 text-white text-sm
                           px-4 py-2 rounded font-semibold transition-colors
                           disabled:opacity-50"
                  >
                    {{ asignando() ? '⟳ Asignando...' : '✓ Confirmar Asignación' }}
                  </button>
                </div>
              </div>
            } @else {
              <div class="flex gap-2 justify-end">
                <a [routerLink]="['/sistema/seleccion', idConv, 'eval-curricular']"
                   class="btn-ghost text-sm">← Evaluación Curricular</a>
                <button
                  (click)="mostrarConfirmacion.set(true)"
                  class="btn-primary"
                >
                  Asignar Códigos Anónimos (E25)
                </button>
              </div>
            }
          </div>
        }
      }
    </div>

    <app-confirm-dialog
      [open]="mostrarAvisoNotificarComite()"
      [title]="avisoNotificarComiteTitle"
      [message]="avisoNotificarComiteMessage"
      cancelText="Más tarde"
      confirmText="Entendido"
      [confirmDanger]="false"
      (confirm)="cerrarAvisoNotificarComite()"
      (cancel)="cerrarAvisoNotificarComite()" />
  `,
})
export class CodigosAnonimosComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly convSvc = inject(ConvocatoriaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  readonly loading = signal(true);
  readonly asignando = signal(false);
  readonly notificando = signal(false);
  readonly mostrarConfirmacion = signal(false);
  /** Recordatorio ORH: códigos listos pero aún no se notificó al Comité (E25 → E26). */
  readonly mostrarAvisoNotificarComite = signal(false);
  readonly postulantes = signal<PostulacionSeleccion[]>([]);
  readonly notificacionEnviada = signal(false);
  readonly mensajeNotificacion = signal('');

  readonly avisoNotificarComiteTitle = 'Pendiente: notificar al Comité';
  readonly avisoNotificarComiteMessage =
    'Los códigos anónimos ya están asignados. Debe usar el botón «Notificar al Comité» en esta pantalla ' +
    'para que el Comité pueda continuar con E26 — Evaluación Técnica (D.L. 1451). ' +
    'Hasta enviar esa notificación, el flujo no queda completo para el Comité.';

  readonly aptos = computed(() =>
    this.postulantes().filter((p) => p.estado === 'APTO'),
  );

  readonly aptosCount = computed(() => this.aptos().length);

  /** Postulantes APTO que ya tienen código asignado */
  readonly codigosAsignados = computed(() =>
    this.aptos().filter((p) => p.codigoAnonimo != null),
  );

  /** Verdadero si ya se asignaron códigos a todos los APTO */
  readonly yaAsignados = computed(
    () => this.aptosCount() > 0 && this.codigosAsignados().length === this.aptosCount(),
  );

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.svc
      .listarPostulantes(this.idConv, 0, 200)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.postulantes.set(page.content ?? []);
          this.cargarFlagNotificacion();
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Error al verificar el estado de los postulantes.');
        },
      });
  }

  private cargarFlagNotificacion(): void {
    this.convSvc
      .obtener(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          const enviada = r.data?.notificacionCodigosEnviada === true;
          this.notificacionEnviada.set(enviada);
          this.loading.set(false);
          if (this.yaAsignados() && !enviada) {
            this.mostrarAvisoNotificarComite.set(true);
          }
        },
        error: () => this.loading.set(false),
      });
  }

  asignar(): void {
    if (this.asignando()) return;
    this.asignando.set(true);

    this.svc
      .asignarCodigosAnonimos(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.postulantes.set(
            this.postulantes().map((p) => {
              const actualizado = res.find((r) => r.idPostulacion === p.idPostulacion);
              return actualizado ?? p;
            }),
          );
          this.mostrarConfirmacion.set(false);
          this.asignando.set(false);
          this.toast.success(
            `Códigos asignados a ${res.length} postulante(s). Notifique al Comité para proceder con E26.`,
          );
          if (!this.notificacionEnviada()) {
            this.mostrarAvisoNotificarComite.set(true);
          }
        },
        error: (err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message ?? 'Error al asignar códigos anónimos.');
          this.mostrarConfirmacion.set(false);
          this.asignando.set(false);
        },
      });
  }

  notificar(): void {
    if (this.notificando()) return;
    this.notificando.set(true);

    this.svc
      .notificarCodigosAnonimos(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.notificacionEnviada.set(true);
          this.mensajeNotificacion.set(res.mensaje + ' ');
          this.notificando.set(false);
          this.mostrarAvisoNotificarComite.set(false);
          this.toast.success(res.mensaje);
        },
        error: (err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message ?? 'Error al notificar al Comité.');
          this.notificando.set(false);
        },
      });
  }

  cerrarAvisoNotificarComite(): void {
    this.mostrarAvisoNotificarComite.set(false);
  }
}
