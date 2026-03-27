import {
  Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ToastService } from '@core/services/toast.service';
import { UsuarioAdminService } from '../../services/usuario-admin.service';
import { AreaAdminService } from '../../services/area-admin.service';
import { UsuarioAdmin, UsuarioRequest, UsuarioUpdateRequest, AreaOrganizacional } from '../../models/admin.model';

const ROLES_DISPONIBLES = ['ADMIN', 'ORH', 'OPP', 'AREA_SOLICITANTE', 'COMITE', 'POSTULANTE', 'OI'];

const ROL_LABELS: Record<string, string> = {
  ADMIN:            'ROL ADMIN',
  ORH:              'ROL ORH',
  OPP:              'ROL OPP',
  AREA_SOLICITANTE: 'ROL OFICINA SOLICITANTE',
  COMITE:           'ROL COMITE',
  POSTULANTE:       'POSTULANTE',
  OI:               'ROL OI',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAM_PAGINA = 10;

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <app-page-header title="Gestión de Usuarios" subtitle="M10 — Administración de usuarios del sistema" />

      <!-- Toolbar -->
      <div class="flex justify-between items-center mb-4">
        <input
          [ngModel]="filtro()"
          (ngModelChange)="onFiltro($event)"
          placeholder="Buscar por nombre, username o email..."
          class="border rounded px-3 py-1.5 text-sm w-72" />
        <button (click)="abrirNuevo()"
          class="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
          + Nuevo usuario
        </button>
      </div>

      <!-- Tabla -->
      @if (cargando()) {
        <p class="text-sm text-gray-500">Cargando...</p>
      } @else {
        <div class="overflow-x-auto rounded border">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th class="px-3 py-2 text-left">Usuario</th>
                <th class="px-3 py-2 text-left w-48">Nombre completo</th>
                <th class="px-3 py-2 text-left">Email</th>
                <th class="px-3 py-2 text-left">Roles</th>
                <th class="px-3 py-2 text-left">Estado</th>
                <th class="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (u of usuariosPaginados(); track u.idUsuario) {
                <tr class="border-t hover:bg-gray-50">
                  <td class="px-3 py-2 font-mono text-xs">{{ u.username }}</td>
                  <td class="px-3 py-2 max-w-[200px]">
                    <div class="text-sm font-medium text-gray-800 truncate" [title]="u.nombres">{{ u.nombres }}</div>
                    <div class="text-xs text-gray-500 truncate" [title]="u.apellidos">{{ u.apellidos }}</div>
                  </td>
                  <td class="px-3 py-2 text-gray-600">{{ u.email }}</td>
                  <td class="px-3 py-2">
                    <div class="flex flex-wrap gap-1">
                      @for (r of u.roles; track r) {
                        <span class="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded">{{ rolLabel(r) }}</span>
                      }
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <span [class]="u.estado === 'ACTIVO' ? 'text-green-600 font-medium' : 'text-red-500'">
                      {{ u.estado }}
                    </span>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex gap-2">
                      <button (click)="abrirEditar(u)" class="text-blue-600 hover:underline text-xs">Editar</button>
                      @if (u.estado === 'ACTIVO') {
                        <button (click)="cambiarEstado(u, false)" class="text-red-500 hover:underline text-xs">Desactivar</button>
                      } @else {
                        <button (click)="cambiarEstado(u, true)" class="text-green-600 hover:underline text-xs">Activar</button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="px-3 py-4 text-center text-gray-400 text-sm">Sin resultados</td></tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="flex items-center justify-between mt-3">
          <span class="text-xs text-gray-500">
            {{ usuariosFiltrados().length }} usuario(s)
            @if (filtro()) { · filtrado de {{ usuarios().length }} total }
          </span>
          <div class="flex items-center gap-2">
            <button (click)="paginaAnterior()" [disabled]="paginaActual() === 0"
              class="px-2.5 py-1 border rounded text-xs disabled:opacity-40 hover:bg-gray-50">
              ← Ant.
            </button>
            <span class="text-xs text-gray-600">
              {{ paginaActual() + 1 }} / {{ totalPaginas() }}
            </span>
            <button (click)="paginaSiguiente()" [disabled]="paginaActual() >= totalPaginas() - 1"
              class="px-2.5 py-1 border rounded text-xs disabled:opacity-40 hover:bg-gray-50">
              Sig. →
            </button>
          </div>
        </div>
      }

      <!-- Modal -->
      @if (mostrarModal()) {
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 class="font-bold text-base mb-4">{{ modoEditar() ? 'Editar usuario' : 'Nuevo usuario' }}</h2>

            <div class="grid grid-cols-2 gap-3 mb-3">
              @if (!modoEditar()) {
                <div class="col-span-2">
                  <label class="text-xs text-gray-500">Username * <span class="text-gray-400">(solo minúsculas)</span></label>
                  <input [(ngModel)]="form.username"
                    class="w-full border rounded px-2 py-1.5 text-sm"
                    [class.border-amber-400]="tieneAviso('username')"
                    (input)="forzarMinusculas($event)" />
                </div>
                <div class="col-span-2">
                  <label class="text-xs text-gray-500">
                    Contraseña * <span class="text-gray-400">(mínimo 8 caracteres)</span>
                  </label>
                  <input type="password" [(ngModel)]="form.password"
                    class="w-full border rounded px-2 py-1.5 text-sm"
                    [class.border-amber-400]="tieneAviso('contraseña')" />
                </div>
              }
              <div>
                <label class="text-xs text-gray-500">Nombres *</label>
                <input [(ngModel)]="form.nombres"
                  class="w-full border rounded px-2 py-1.5 text-sm"
                  [class.border-amber-400]="tieneAviso('nombres')" />
              </div>
              <div>
                <label class="text-xs text-gray-500">Apellidos *</label>
                <input [(ngModel)]="form.apellidos"
                  class="w-full border rounded px-2 py-1.5 text-sm"
                  [class.border-amber-400]="tieneAviso('apellidos')" />
              </div>
              <div class="col-span-2">
                <label class="text-xs text-gray-500">Email *</label>
                <input [(ngModel)]="form.email"
                  class="w-full border rounded px-2 py-1.5 text-sm"
                  [class.border-amber-400]="tieneAviso('email')" />
              </div>
              <div class="col-span-2">
                <label class="text-xs text-gray-500">Área *</label>
                <select [(ngModel)]="form.idArea"
                  class="w-full border rounded px-2 py-1.5 text-sm"
                  [class.border-amber-400]="tieneAviso('área')">
                  <option [ngValue]="null">— Seleccione un área —</option>
                  @for (a of areas(); track a.idArea) {
                    <option [ngValue]="a.idArea">{{ a.codigoArea }} — {{ a.nombreArea }}</option>
                  }
                </select>
              </div>
              <div class="col-span-2">
                <label class="text-xs text-gray-500 block mb-1">Roles</label>
                <div class="flex flex-wrap gap-2">
                  @for (r of rolesDisponibles; track r) {
                    <label class="flex items-center gap-1 text-sm cursor-pointer">
                      <input type="checkbox" [checked]="form.rolesCodigosRol.includes(r)"
                        (change)="toggleRol(r, $any($event.target).checked)" />
                      {{ rolLabel(r) }}
                    </label>
                  }
                </div>
              </div>
            </div>

            <!-- Panel de advertencias inline -->
            @if (avisos().length > 0) {
              <div class="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-3">
                <p class="text-xs font-semibold text-amber-700 mb-1.5">
                  ⚠ Revise los siguientes campos antes de continuar:
                </p>
                <ul class="space-y-0.5">
                  @for (aviso of avisos(); track aviso) {
                    <li class="text-xs text-amber-700 flex items-start gap-1.5">
                      <span class="shrink-0 mt-0.5">•</span>
                      <span>{{ aviso }}</span>
                    </li>
                  }
                </ul>
              </div>
            }

            <div class="flex justify-end gap-2 mt-2">
              <button (click)="cerrarModal()" class="px-4 py-1.5 border rounded text-sm">Cancelar</button>
              <button (click)="guardar()" [disabled]="guardando()"
                class="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                {{ guardando() ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class UsuariosComponent {
  private readonly svc        = inject(UsuarioAdminService);
  private readonly areaSvc    = inject(AreaAdminService);
  private readonly toast      = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rolesDisponibles = ROLES_DISPONIBLES;

  readonly cargando     = signal(false);
  readonly guardando    = signal(false);
  readonly mostrarModal = signal(false);
  readonly modoEditar   = signal(false);
  readonly usuarios     = signal<UsuarioAdmin[]>([]);
  readonly areas        = signal<AreaOrganizacional[]>([]);
  readonly avisos       = signal<string[]>([]);

  // ── Filtro y paginación — todos signals para reactividad correcta en OnPush ──
  readonly filtro      = signal('');
  readonly paginaActual = signal(0);

  editandoId: number | null = null;

  form: {
    username: string; password: string;
    nombres: string; apellidos: string;
    email: string; idArea: number | null;
    rolesCodigosRol: string[];
  } = { username: '', password: '', nombres: '', apellidos: '', email: '', idArea: null, rolesCodigosRol: [] };

  // ── Computed: filtrado reactivo (depende solo de signals) ────────────────
  readonly usuariosFiltrados = computed(() => {
    const q = this.filtro().toLowerCase().trim();
    if (!q) return this.usuarios();
    return this.usuarios().filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.nombres.toLowerCase().includes(q) ||
      u.apellidos.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    );
  });

  // ── Computed: paginación sobre el resultado filtrado ─────────────────────
  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.usuariosFiltrados().length / TAM_PAGINA)),
  );

  readonly usuariosPaginados = computed(() => {
    const inicio = this.paginaActual() * TAM_PAGINA;
    return this.usuariosFiltrados().slice(inicio, inicio + TAM_PAGINA);
  });

  constructor() {
    this.cargar();
    this.areaSvc.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(a => this.areas.set(a));
  }

  // ── Helpers de template ──────────────────────────────────────────────────

  rolLabel(codigo: string): string {
    return ROL_LABELS[codigo] ?? codigo;
  }

  tieneAviso(clave: string): boolean {
    return this.avisos().some(a => a.toLowerCase().includes(clave.toLowerCase()));
  }

  forzarMinusculas(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.toLowerCase();
    input.value = val;
    this.form.username = val;
  }

  // ── Filtro + reset de página ─────────────────────────────────────────────

  onFiltro(valor: string): void {
    this.filtro.set(valor);
    this.paginaActual.set(0); // volver a página 1 al filtrar
  }

  // ── Paginación ───────────────────────────────────────────────────────────

  paginaAnterior(): void {
    if (this.paginaActual() > 0) this.paginaActual.update(p => p - 1);
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas() - 1) this.paginaActual.update(p => p + 1);
  }

  // ── Apertura / cierre del modal ──────────────────────────────────────────

  abrirNuevo(): void {
    this.modoEditar.set(false);
    this.editandoId = null;
    this.form = { username: '', password: '', nombres: '', apellidos: '', email: '', idArea: null, rolesCodigosRol: [] };
    this.avisos.set([]);
    this.mostrarModal.set(true);
  }

  abrirEditar(u: UsuarioAdmin): void {
    this.modoEditar.set(true);
    this.editandoId = u.idUsuario;
    this.form = {
      username: u.username, password: '',
      nombres: u.nombres, apellidos: u.apellidos,
      email: u.email, idArea: u.idArea,
      rolesCodigosRol: [...u.roles],
    };
    this.avisos.set([]);
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.avisos.set([]);
    this.mostrarModal.set(false);
  }

  toggleRol(rol: string, checked: boolean): void {
    this.form.rolesCodigosRol = checked
      ? [...this.form.rolesCodigosRol, rol]
      : this.form.rolesCodigosRol.filter(r => r !== rol);
  }

  // ── Guardar ──────────────────────────────────────────────────────────────

  guardar(): void {
    if (this.guardando()) return;

    const errores = this.validarFormulario();
    if (errores.length > 0) { this.avisos.set(errores); return; }

    this.avisos.set([]);
    this.guardando.set(true);

    if (this.modoEditar() && this.editandoId != null) {
      const req: UsuarioUpdateRequest = {
        nombres: this.form.nombres.trim(),
        apellidos: this.form.apellidos.trim(),
        email: this.form.email.trim(),
        idArea: this.form.idArea,
        rolesCodigosRol: this.form.rolesCodigosRol,
      };
      this.svc.actualizar(this.editandoId, req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.toast.success('Usuario actualizado correctamente'); this.cerrarModal(); this.cargar(); this.guardando.set(false); },
        error: (e) => this.manejarError(e),
      });
    } else {
      const req: UsuarioRequest = {
        username: this.form.username.trim(),
        password: this.form.password,
        nombres: this.form.nombres.trim(),
        apellidos: this.form.apellidos.trim(),
        email: this.form.email.trim(),
        idArea: this.form.idArea,
        rolesCodigosRol: this.form.rolesCodigosRol,
      };
      this.svc.crear(req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.toast.success('Usuario creado correctamente'); this.cerrarModal(); this.cargar(); this.guardando.set(false); },
        error: (e) => this.manejarError(e),
      });
    }
  }

  cambiarEstado(u: UsuarioAdmin, activar: boolean): void {
    const op = activar ? this.svc.activar(u.idUsuario) : this.svc.desactivar(u.idUsuario);
    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.toast.success(activar ? 'Usuario activado' : 'Usuario desactivado'); this.cargar(); },
      error: (e) => this.toast.warning(e?.error?.message ?? 'No se pudo cambiar el estado'),
    });
  }

  // ── Privados (SRP) ────────────────────────────────────────────────────────

  private cargar(): void {
    this.cargando.set(true);
    this.svc.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => { this.usuarios.set(list); this.paginaActual.set(0); this.cargando.set(false); },
      error: () => { this.toast.error('Error al cargar usuarios'); this.cargando.set(false); },
    });
  }

  /** SRP: solo valida. Retorna mensajes amigables. Vacío = válido. */
  private validarFormulario(): string[] {
    const errores: string[] = [];
    const esNuevo = !this.modoEditar();

    if (esNuevo) {
      if (!this.form.username?.trim())
        errores.push('Username es obligatorio');
      else if (this.form.username.trim().length < 4)
        errores.push('Username debe tener al menos 4 caracteres');

      if (!this.form.password?.trim())
        errores.push('Contraseña es obligatoria');
      else if (this.form.password.length < 8)
        errores.push('La contraseña debe tener mínimo 8 caracteres');
    }

    if (!this.form.nombres?.trim())  errores.push('Nombres es obligatorio');
    if (!this.form.apellidos?.trim()) errores.push('Apellidos es obligatorio');

    if (!this.form.email?.trim())
      errores.push('Email es obligatorio');
    else if (!EMAIL_RE.test(this.form.email.trim()))
      errores.push('El formato del email no es válido (ej: usuario@dominio.com)');

    if (this.form.idArea == null)
      errores.push('Área es obligatoria — seleccione un área organizacional');

    return errores;
  }

  /** SRP: solo parsea mensajes del backend ("campo: msg, campo2: msg2" → ["msg", "msg2"]) */
  private parsearMensajeBackend(msg: string): string[] {
    if (!msg) return ['Verifique los datos ingresados'];
    return msg.split(', ').map(parte => {
      const idx = parte.indexOf(': ');
      return idx !== -1 ? parte.substring(idx + 2) : parte;
    }).filter(m => m.length > 0);
  }

  /** SRP: solo clasifica y despacha errores HTTP. 4xx → inline. 5xx → toast. */
  private manejarError(e: unknown): void {
    this.guardando.set(false);
    const err = e as { status?: number; error?: { message?: string } };
    if ((err?.status ?? 0) >= 500) {
      this.toast.error('Error del servidor. Intente nuevamente o contacte al administrador.');
    } else {
      this.avisos.set(this.parsearMensajeBackend(err?.error?.message ?? ''));
    }
  }
}
