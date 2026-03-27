import {
  Component, ChangeDetectionStrategy, inject, signal, DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ToastService } from '@core/services/toast.service';
import { LogAdminService } from '../../services/log-admin.service';
import { LogTransparencia } from '../../models/admin.model';

@Component({
  selector: 'app-log-transparencia',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <app-page-header title="Log de Transparencia" subtitle="M10 — Auditoría D.L. 1451 — Registro de acciones sobre entidades del sistema" />

      <!-- Toolbar -->
      <div class="flex items-center gap-3 mb-4">
        <select [(ngModel)]="tamano" (ngModelChange)="cargar()" class="border rounded px-2 py-1.5 text-sm">
          <option [ngValue]="20">20 registros</option>
          <option [ngValue]="50">50 registros</option>
          <option [ngValue]="100">100 registros</option>
        </select>
        <button (click)="exportarCsv()" class="border px-3 py-1.5 rounded text-sm hover:bg-gray-50">
          ⬇ Exportar CSV
        </button>
        <span class="text-xs text-gray-500 ml-auto">Total: {{ totalElementos() }} registros</span>
      </div>

      @if (cargando()) {
        <p class="text-sm text-gray-500">Cargando...</p>
      } @else {
        <div class="overflow-x-auto rounded border">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th class="px-3 py-2 text-left">Fecha</th>
                <th class="px-3 py-2 text-left">Usuario</th>
                <th class="px-3 py-2 text-left">Acción</th>
                <th class="px-3 py-2 text-left">Estado anterior</th>
                <th class="px-3 py-2 text-left">Estado nuevo</th>
                <th class="px-3 py-2 text-left">Sustento</th>
                <th class="px-3 py-2 text-left">Datos adicionales</th>
              </tr>
            </thead>
            <tbody>
              @for (log of logs(); track log.idLog) {
                <tr class="border-t hover:bg-gray-50">
                  <td class="px-3 py-2 whitespace-nowrap">{{ formatFecha(log.fechaAccion) }}</td>
                  <td class="px-3 py-2 font-medium">{{ log.usuarioAccion ?? '—' }}</td>
                  <td class="px-3 py-2">
                    <span [class]="claseAccion(log.accion)">{{ log.accion }}</span>
                  </td>
                  <td class="px-3 py-2 text-gray-500">{{ log.estadoAnterior ?? '—' }}</td>
                  <td class="px-3 py-2">{{ log.estadoNuevo ?? '—' }}</td>
                  <td class="px-3 py-2 text-gray-700 max-w-xs truncate" [title]="log.sustento ?? ''">{{ log.sustento ?? '—' }}</td>
                  <td class="px-3 py-2 text-gray-500 max-w-xs truncate" [title]="log.datosAdicionales ?? ''">{{ log.datosAdicionales ?? '—' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-3 py-4 text-center text-gray-400">Sin registros</td></tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="flex items-center justify-between mt-4 text-sm">
          <button (click)="paginaAnterior()" [disabled]="pagina() === 0"
            class="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">
            ← Anterior
          </button>
          <span class="text-gray-500">Página {{ pagina() + 1 }} de {{ totalPaginas() }}</span>
          <button (click)="paginaSiguiente()" [disabled]="pagina() >= totalPaginas() - 1"
            class="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">
            Siguiente →
          </button>
        </div>
      }
    </div>
  `,
})
export class LogTransparenciaComponent {
  private readonly svc = inject(LogAdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal(false);
  readonly logs = signal<LogTransparencia[]>([]);
  readonly pagina = signal(0);
  readonly totalElementos = signal(0);
  readonly totalPaginas = signal(1);
  tamano = 20;

  constructor() { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.svc.listar(this.pagina(), this.tamano).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (p) => {
        this.logs.set(p.content);
        this.totalElementos.set(p.totalElements);
        this.totalPaginas.set(p.totalPages || 1);
        this.cargando.set(false);
      },
      error: () => { this.toast.error('Error al cargar logs'); this.cargando.set(false); },
    });
  }

  paginaAnterior(): void {
    if (this.pagina() > 0) { this.pagina.update(p => p - 1); this.cargar(); }
  }

  paginaSiguiente(): void {
    if (this.pagina() < this.totalPaginas() - 1) { this.pagina.update(p => p + 1); this.cargar(); }
  }

  formatFecha(f: string): string {
    if (!f) return '—';
    return new Date(f).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  }

  claseAccion(accion: string): string {
    const map: Record<string, string> = {
      CREAR: 'text-green-600 font-medium',
      ACTUALIZAR: 'text-blue-600 font-medium',
      ELIMINAR: 'text-red-600 font-medium',
      ACTIVAR: 'text-green-600',
      DESACTIVAR: 'text-red-500',
    };
    return map[accion] ?? 'text-gray-700';
  }

  exportarCsv(): void {
    const rows = this.logs();
    if (!rows.length) return;
    const header = ['Fecha', 'Usuario', 'Accion', 'Estado Anterior', 'Estado Nuevo', 'Sustento', 'Datos Adicionales'];
    const lines = [header.join(','), ...rows.map(l => [
      this.formatFecha(l.fechaAccion),
      l.usuarioAccion ?? '',
      l.accion,
      l.estadoAnterior ?? '',
      l.estadoNuevo ?? '',
      `"${(l.sustento ?? '').replace(/"/g, '""')}"`,
      `"${(l.datosAdicionales ?? '').replace(/"/g, '""')}"`,
    ].join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log-transparencia-pag${this.pagina() + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
