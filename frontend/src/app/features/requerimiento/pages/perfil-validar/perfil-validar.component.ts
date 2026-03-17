import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { PerfilPuestoService } from '../../services/perfil-puesto.service';
import { PerfilPuestoResponse, ValidarPerfilRequest, AprobarPerfilRequest } from '../../models/perfil-puesto.model';
import { ToastService } from '@core/services/toast.service';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DatePeruPipe } from '@shared/pipes/date-peru.pipe';

@Component({
  selector: 'app-perfil-validar',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, StatusBadgeComponent, PageHeaderComponent, DatePeruPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <app-page-header title="Validar y Aprobar Perfil" [estado]="perfil()?.estado" subtitle="ORH — Validación contra MPP vigente">
        <a routerLink="/sistema/requerimiento/perfiles" class="btn-ghost">← Volver</a>
      </app-page-header>

      @if (loading()) {
        <div class="card text-center py-12 text-gray-400">Cargando perfil...</div>
      } @else if (perfil()) {
        <!-- Resumen del perfil -->
        <div class="card space-y-3">
          <h2 class="font-semibold text-gray-800">{{ perfil()!.denominacionPuesto }}</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span class="text-gray-500">Unidad:</span> <strong>{{ perfil()!.unidadOrganica }}</strong></div>
            <div><span class="text-gray-500">Puestos:</span> <strong>{{ perfil()!.cantidadPuestos }}</strong></div>
            <div><span class="text-gray-500">Creado:</span> <strong>{{ perfil()!.fechaCreacion | datePeru }}</strong></div>
            <div><span class="text-gray-500">Estado:</span> <app-status-badge [estado]="perfil()!.estado" [label]="perfil()!.estado" /></div>
          </div>
        </div>

        <!-- Acción: Validar (solo si PENDIENTE) -->
        @if (perfil()!.estado === 'PENDIENTE') {
          <div class="card space-y-4">
            <h3 class="font-semibold text-gray-800">Validación contra MPP Vigente</h3>
            <div>
              <label class="label-field">¿El perfil cumple con el MPP vigente? *</label>
              <div class="flex gap-4 mt-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" [formControl]="validarForm.controls.cumpleMpp" [value]="true" class="accent-[#1F2133]" />
                  <span class="text-sm text-green-700 font-medium">✅ Sí, cumple</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" [formControl]="validarForm.controls.cumpleMpp" [value]="false" class="accent-[#1F2133]" />
                  <span class="text-sm text-red-700 font-medium">❌ No cumple</span>
                </label>
              </div>
            </div>
            <div>
              <label class="label-field">Observaciones</label>
              <textarea [formControl]="validarForm.controls.observaciones" class="input-field" rows="3" maxlength="1000" placeholder="Observaciones de la validación..."></textarea>
            </div>
            <button (click)="onValidar()" [disabled]="saving()" class="btn-primary">
              @if (saving()) { <span class="animate-spin mr-1">⟳</span> } Registrar Validación
            </button>
          </div>
        }

        <!-- Acción: Aprobar (solo si VALIDADO) -->
        @if (perfil()!.estado === 'VALIDADO') {
          <div class="card space-y-4">
            <h3 class="font-semibold text-gray-800">Aprobación del Perfil</h3>
            <div>
              <label class="label-field">Observaciones de aprobación</label>
              <textarea [formControl]="aprobarForm.controls.observaciones" class="input-field" rows="3" maxlength="1000"></textarea>
            </div>
            <div class="flex gap-3">
              <button (click)="onAprobar(true)" [disabled]="saving()" class="btn-primary">✅ Aprobar Perfil</button>
              <button (click)="onAprobar(false)" [disabled]="saving()" class="btn-danger">❌ Rechazar</button>
            </div>
          </div>
        }

        @if (perfil()!.estado === 'APROBADO') {
          <div class="card bg-green-50 border-green-200 text-green-800 text-center py-8">
            <div class="text-4xl mb-2">✅</div>
            <p class="font-semibold">Perfil aprobado el {{ perfil()!.fechaAprobacion | datePeru }}</p>
            <p class="text-sm mt-1">Por: {{ perfil()!.usuarioAprobacion }}</p>
          </div>
        }
      }
    </div>
  `,
})
export class PerfilValidarComponent implements OnInit {
  private svc = inject(PerfilPuestoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  perfil = signal<PerfilPuestoResponse | null>(null);
  loading = signal(true);
  saving = signal(false);

  validarForm = this.fb.nonNullable.group({
    cumpleMpp: [true as boolean, Validators.required],
    observaciones: [''],
  });

  aprobarForm = this.fb.nonNullable.group({ observaciones: [''] });

  ngOnInit(): void {
    const id = +this.route.snapshot.params['id'];
    this.svc.obtener(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => { this.perfil.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onValidar(): void {
    this.saving.set(true);
    const id = this.perfil()!.idPerfilPuesto;
    const req: ValidarPerfilRequest = this.validarForm.getRawValue();
    this.svc.validar(id, req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => { this.perfil.set(res.data); this.saving.set(false); this.toast.success(req.cumpleMpp ? 'Perfil validado correctamente' : 'Perfil observado'); },
      error: () => this.saving.set(false),
    });
  }

  onAprobar(aprobado: boolean): void {
    this.saving.set(true);
    const id = this.perfil()!.idPerfilPuesto;
    const req: AprobarPerfilRequest = { aprobado, observaciones: this.aprobarForm.getRawValue().observaciones };
    this.svc.aprobar(id, req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => { this.perfil.set(res.data); this.saving.set(false); this.toast.success(aprobado ? 'Perfil aprobado' : 'Perfil rechazado'); },
      error: () => this.saving.set(false),
    });
  }
}
