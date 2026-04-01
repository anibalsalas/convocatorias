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
import { DatePipe } from '@angular/common';
import { SeleccionService } from '../../services/seleccion.service';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ComunicadoResponse } from '../../models/seleccion.model';

@Component({
  selector: 'app-comunicados',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <app-page-header
        title="Comunicados Oficiales"
        subtitle="DS 083-2019-PCM Art. 10 · Aclaraciones y ampliaciones de plazo">
        <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
           class="btn-ghost text-sm">← Postulantes</a>
      </app-page-header>

      <!-- Banner normativo -->
      <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 leading-relaxed">
        <strong>Base legal:</strong> DS 083-2019-PCM Art. 10 — ORH puede publicar comunicados de aclaración,
        fe de erratas o ampliación de plazo en cualquier etapa del proceso de selección CAS.
        Los comunicados son de acceso público en el portal de transparencia.
      </div>

      <!-- Formulario nuevo comunicado — solo ORH -->
      @if (esOrhOAdmin()) {
        <div class="card space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-700">
              {{ mostrarFormulario() ? '✏️ Redactar comunicado' : '📢 Nuevo comunicado' }}
            </h2>
            <button
              (click)="toggleFormulario()"
              class="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
              [class]="mostrarFormulario()
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-[#1E3A5F] text-white hover:bg-[#2D5F8A]'"
            >
              {{ mostrarFormulario() ? 'Cancelar' : '+ Publicar comunicado' }}
            </button>
          </div>

          @if (mostrarFormulario()) {
            <div class="space-y-3 pt-1 border-t">
              <div class="space-y-1">
                <label class="label-field">
                  Título <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="titulo"
                  maxlength="200"
                  placeholder="Ej.: Ampliación de plazo de postulación, Fe de errata N°1..."
                  class="input-field w-full"
                />
                <p class="text-xs text-gray-400 text-right">{{ titulo.length }}/200</p>
              </div>

              <div class="space-y-1">
                <label class="label-field">
                  Descripción / Contenido <span class="text-red-500">*</span>
                </label>
                <textarea
                  [(ngModel)]="descripcion"
                  rows="5"
                  placeholder="Redacte el contenido oficial del comunicado..."
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/40 resize-y"
                ></textarea>
              </div>

              <div class="flex justify-end gap-2">
                <button
                  (click)="toggleFormulario()"
                  class="btn-ghost text-sm"
                >Cancelar</button>
                <button
                  (click)="publicar()"
                  [disabled]="publicando() || titulo.trim().length < 3 || descripcion.trim().length < 10"
                  class="bg-[#1E3A5F] hover:bg-[#2D5F8A] text-white text-sm font-semibold
                         px-5 py-2 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ publicando() ? '⟳ Publicando...' : '📢 Publicar comunicado' }}
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Lista de comunicados -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-700">
            Comunicados publicados
            @if (comunicados().length > 0) {
              <span class="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                {{ comunicados().length }}
              </span>
            }
          </h2>
        </div>

        @if (loading()) {
          <div class="py-10 text-center text-gray-400 text-sm">
            <span class="animate-spin inline-block mr-2">⟳</span> Cargando...
          </div>
        } @else if (comunicados().length === 0) {
          <div class="py-10 text-center space-y-1">
            <p class="text-gray-400 text-sm">No hay comunicados publicados para esta convocatoria.</p>
            @if (esOrhOAdmin()) {
              <p class="text-xs text-gray-400">
                Use el botón <strong>"+ Publicar comunicado"</strong> para agregar uno.
              </p>
            }
          </div>
        } @else {
          <div class="space-y-3">
            @for (c of comunicados(); track c.idComunicado; let i = $index) {
              <div class="rounded-lg border border-gray-200 bg-white p-4 space-y-2
                          hover:border-blue-300 hover:shadow-sm transition-all">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-400 w-6 text-right shrink-0">
                      #{{ comunicados().length - i }}
                    </span>
                    <h3 class="text-sm font-semibold text-[#1E3A5F]">{{ c.titulo }}</h3>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-xs text-gray-400">
                      {{ c.fechaPublicacion | date:'dd/MM/yyyy HH:mm' }}
                    </p>
                    @if (c.usuarioCreacion) {
                      <p class="text-xs text-gray-400 italic">{{ c.usuarioCreacion }}</p>
                    }
                  </div>
                </div>
                <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap pl-8">
                  {{ c.descripcion }}
                </p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ComunicadosComponent {
  private readonly route      = inject(ActivatedRoute);
  private readonly svc        = inject(SeleccionService);
  private readonly auth       = inject(AuthService);
  private readonly toast      = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idConv = Number(this.route.snapshot.paramMap.get('id'));

  readonly esOrhOAdmin = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH']),
  );

  readonly loading       = signal(true);
  readonly publicando    = signal(false);
  readonly mostrarFormulario = signal(false);
  readonly comunicados   = signal<ComunicadoResponse[]>([]);

  titulo      = '';
  descripcion = '';

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.loading.set(true);
    this.svc.listarComunicados(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => { this.comunicados.set(lista); this.loading.set(false); },
        error: ()      => this.loading.set(false),
      });
  }

  toggleFormulario(): void {
    this.mostrarFormulario.update((v) => !v);
    if (!this.mostrarFormulario()) {
      this.titulo = '';
      this.descripcion = '';
    }
  }

  publicar(): void {
    if (this.titulo.trim().length < 3 || this.descripcion.trim().length < 10) return;
    this.publicando.set(true);
    this.svc.publicarComunicado(this.idConv, {
      titulo: this.titulo.trim(),
      descripcion: this.descripcion.trim(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (nuevo) => {
          this.comunicados.update((list) => [nuevo, ...list]);
          this.titulo = '';
          this.descripcion = '';
          this.mostrarFormulario.set(false);
          this.publicando.set(false);
          this.toast.success('Comunicado publicado correctamente');
        },
        error: () => {
          this.publicando.set(false);
          this.toast.error('Error al publicar el comunicado');
        },
      });
  }
}
