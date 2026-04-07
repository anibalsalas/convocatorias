import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RequerimientoService } from '../../services/requerimiento.service';
import { PerfilPuestoService } from '../../services/perfil-puesto.service';
import { PerfilPuestoResponse } from '../../models/perfil-puesto.model';
import { RequerimientoRequest } from '../../models/requerimiento.model';
import { ToastService } from '@core/services/toast.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-requerimiento-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header title="Elaborar Requerimiento de Personal" subtitle="D.S. 075-2008-PCM Art. 3 — Seleccione un perfil aprobado">
        <a routerLink="/sistema/requerimiento/requerimientos" class="btn-ghost">← Volver</a>
      </app-page-header>

      <form [formGroup]="form" (ngSubmit)="onCrear()" class="card space-y-5">
        @if (perfilPreseleccionado()) {
          <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Perfil preseleccionado desde el listado de perfiles: <strong>{{ perfilPreseleccionado()!.denominacionPuesto }}</strong>
          </div>
        }

        <div>
          <label class="label-field">Perfil de Puesto Aprobado *</label>
          <select formControlName="idPerfilPuesto" class="input-field" aria-label="Seleccionar perfil aprobado">
            <option [ngValue]="null">— Seleccione un perfil aprobado —</option>
            @for (p of perfilesAprobados(); track p.idPerfilPuesto) {
              <option [ngValue]="p.idPerfilPuesto">{{ p.nombrePuesto }} ({{ p.unidadOrganica }})</option>
            }
          </select>
          @if (perfilesAprobados().length === 0 && !loadingPerfiles()) {
            <span class="text-xs text-yellow-600 mt-1 block">No hay perfiles aprobados disponibles. Primero debe crear y aprobar un perfil.</span>
          }
        </div>

        <div>
          <label class="label-field">Justificación de la contratación *</label>
          <textarea formControlName="justificacion" class="input-field" rows="4" maxlength="2000"
            placeholder="Justifique la necesidad de la contratación según D.S. 075-2008-PCM..."></textarea>
          @if (form.controls.justificacion.touched && form.controls.justificacion.errors) {
            <span class="error-text">Obligatorio (máx. 2000 caracteres)</span>
          }
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label-field">Cantidad de Puestos *</label>
            <input formControlName="cantidadPuestos" type="number" class="input-field" min="1" />
          </div>
        </div>

        <div class="flex justify-end">
          <button type="submit" [disabled]="saving() || form.invalid" class="btn-primary">
            @if (saving()) { <span class="animate-spin mr-1">⟳</span> }
            Registrar Requerimiento y Notificar a OPP
          </button>
        </div>
      </form>
    </div>
  `,
})
export class RequerimientoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private reqSvc = inject(RequerimientoService);
  private perfilSvc = inject(PerfilPuestoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  perfilesAprobados = signal<PerfilPuestoResponse[]>([]);
  perfilPreseleccionado = signal<PerfilPuestoResponse | null>(null);
  loadingPerfiles = signal(true);
  saving = signal(false);
  private idAreaSolicitante = signal<number | null>(null);

  form = this.fb.group({
    idPerfilPuesto: [null as number | null, Validators.required],
    justificacion: ['', [Validators.required, Validators.maxLength(2000)]],
    cantidadPuestos: [1, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    // Obtener idAreaSolicitante real del usuario autenticado
    this.perfilSvc.obtenerContextoRegistro()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.idAreaSolicitante.set(res.data.idAreaSolicitante),
      });

    this.perfilSvc.listar({ page: 0, size: 100 }, { estado: 'APROBADO' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const perfiles = res.data.content;
          this.perfilesAprobados.set(perfiles);
          this.loadingPerfiles.set(false);

          const idPerfil = Number(this.route.snapshot.queryParamMap.get('idPerfilPuesto'));
          if (!Number.isNaN(idPerfil) && idPerfil > 0) {
            const perfil = perfiles.find(p => p.idPerfilPuesto === idPerfil) ?? null;
            if (perfil) {
              this.form.patchValue({
                idPerfilPuesto: perfil.idPerfilPuesto,
                cantidadPuestos: perfil.cantidadPuestos ?? 1,
              });
              this.perfilPreseleccionado.set(perfil);
            }
          }
        },
        error: () => this.loadingPerfiles.set(false),
      });
  }

  onCrear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    const req: RequerimientoRequest = {
      idPerfilPuesto: raw.idPerfilPuesto!,
      idAreaSolicitante: this.idAreaSolicitante()!,
      justificacion: raw.justificacion ?? '',
      cantidadPuestos: raw.cantidadPuestos ?? 1,
    };

    this.reqSvc.crear(req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Requerimiento registrado con estado ELABORADO');
          this.router.navigate(['/sistema/requerimiento/requerimientos']);
        },
        error: () => this.saving.set(false),
      });
  }
}
