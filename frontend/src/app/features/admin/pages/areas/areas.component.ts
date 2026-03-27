import {
  Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ToastService } from '@core/services/toast.service';
import { AreaAdminService } from '../../services/area-admin.service';
import { AreaOrganizacional, AreaRequest } from '../../models/admin.model';

@Component({
  selector: 'app-areas',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-6xl mx-auto">
      <app-page-header title="Áreas Organizacionales" subtitle="M10 — Catálogo de áreas de la institución" />

      <!-- Toolbar -->
      <div class="flex justify-between items-center mb-4">
        <input [(ngModel)]="filtro" placeholder="Buscar por código o nombre..."
          class="border rounded px-3 py-1.5 text-sm w-64" />
        <button (click)="abrirNueva()"
          class="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
          + Nueva área
        </button>
      </div>

      @if (cargando()) {
        <p class="text-sm text-gray-500">Cargando...</p>
      } @else {
        <div class="overflow-x-auto rounded border">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th class="px-3 py-2 text-left">Código</th>
                <th class="px-3 py-2 text-left">Nombre</th>
                <th class="px-3 py-2 text-left">Sigla</th>
                <th class="px-3 py-2 text-left">Tipo</th>
                <th class="px-3 py-2 text-left">Responsable</th>
                <th class="px-3 py-2 text-left">Estado</th>
                <th class="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (a of areasFiltradas(); track a.idArea) {
                <tr class="border-t hover:bg-gray-50">
                  <td class="px-3 py-2 font-mono text-xs font-medium">{{ a.codigoArea }}</td>
                  <td class="px-3 py-2">{{ a.nombreArea }}</td>
                  <td class="px-3 py-2 text-gray-600">{{ a.sigla ?? '—' }}</td>
                  <td class="px-3 py-2 text-gray-600">{{ a.tipoArea ?? '—' }}</td>
                  <td class="px-3 py-2 text-gray-600">{{ a.responsable ?? '—' }}</td>
                  <td class="px-3 py-2">
                    <span [class]="a.estado === 'ACTIVO' ? 'text-green-600 font-medium' : 'text-red-500'">
                      {{ a.estado }}
                    </span>
                  </td>
                  <td class="px-3 py-2">
                    <button (click)="abrirEditar(a)" class="text-blue-600 hover:underline text-xs">Editar</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-3 py-4 text-center text-gray-400 text-sm">Sin resultados</td></tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Modal -->
      @if (mostrarModal()) {
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 class="font-bold text-base mb-4">{{ modoEditar() ? 'Editar área' : 'Nueva área' }}</h2>

            <div class="space-y-3">
              <div>
                <label class="text-xs text-gray-500">Código *</label>
                <input [(ngModel)]="form.codigoArea" [disabled]="modoEditar()"
                  class="w-full border rounded px-2 py-1.5 text-sm uppercase disabled:bg-gray-50" />
              </div>
              <div>
                <label class="text-xs text-gray-500">Nombre *</label>
                <input [(ngModel)]="form.nombreArea" class="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-gray-500">Sigla</label>
                  <input [(ngModel)]="form.sigla" class="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label class="text-xs text-gray-500">Tipo de área</label>
                  <input [(ngModel)]="form.tipoArea" class="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
              <div>
                <label class="text-xs text-gray-500">Responsable</label>
                <input [(ngModel)]="form.responsable" class="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              @if (modoEditar()) {
                <div>
                  <label class="text-xs text-gray-500">Estado</label>
                  <select [(ngModel)]="form.estado" class="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
              }
            </div>

            <div class="flex justify-end gap-2 mt-4">
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
export class AreasComponent {
  private readonly svc = inject(AreaAdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly mostrarModal = signal(false);
  readonly modoEditar = signal(false);
  readonly areas = signal<AreaOrganizacional[]>([]);
  filtro = '';
  editandoId: number | null = null;

  form: AreaRequest & { estado?: string } = {
    codigoArea: '', nombreArea: '', sigla: null, tipoArea: null, responsable: null, estado: 'ACTIVO',
  };

  readonly areasFiltradas = computed(() => {
    const q = this.filtro.toLowerCase();
    if (!q) return this.areas();
    return this.areas().filter(a =>
      a.codigoArea.toLowerCase().includes(q) || a.nombreArea.toLowerCase().includes(q),
    );
  });

  constructor() { this.cargar(); }

  private cargar(): void {
    this.cargando.set(true);
    this.svc.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => { this.areas.set(list); this.cargando.set(false); },
      error: () => { this.toast.error('Error al cargar áreas'); this.cargando.set(false); },
    });
  }

  abrirNueva(): void {
    this.modoEditar.set(false);
    this.editandoId = null;
    this.form = { codigoArea: '', nombreArea: '', sigla: null, tipoArea: null, responsable: null, estado: 'ACTIVO' };
    this.mostrarModal.set(true);
  }

  abrirEditar(a: AreaOrganizacional): void {
    this.modoEditar.set(true);
    this.editandoId = a.idArea;
    this.form = { codigoArea: a.codigoArea, nombreArea: a.nombreArea, sigla: a.sigla, tipoArea: a.tipoArea, responsable: a.responsable, estado: a.estado };
    this.mostrarModal.set(true);
  }

  cerrarModal(): void { this.mostrarModal.set(false); }

  guardar(): void {
    if (this.guardando()) return;
    this.guardando.set(true);

    const req: AreaRequest = {
      codigoArea: this.form.codigoArea,
      nombreArea: this.form.nombreArea,
      sigla: this.form.sigla || null,
      tipoArea: this.form.tipoArea || null,
      responsable: this.form.responsable || null,
      estado: this.form.estado ?? null,
    };

    const op = this.modoEditar() && this.editandoId != null
      ? this.svc.actualizar(this.editandoId, req)
      : this.svc.crear(req);

    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(this.modoEditar() ? 'Área actualizada' : 'Área creada');
        this.cerrarModal();
        this.cargar();
        this.guardando.set(false);
      },
      error: (e) => { this.toast.error(e?.error?.message ?? 'Error al guardar'); this.guardando.set(false); },
    });
  }
}
