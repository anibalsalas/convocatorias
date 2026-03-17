import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex-1 flex flex-col min-h-0' },
  template: `
    <div class="min-h-full flex-1 flex items-center justify-center px-4 py-12 w-full"
         style="background: linear-gradient(135deg, #1F2133 0%, #2D5F8A 50%, #1F2133 100%);">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div class="text-center mb-8">
         
          <h1 class="text-2xl font-bold text-gray-800">Iniciar sesión</h1>
          <p class="text-sm text-gray-500 mt-1">Sistema de Convocatorias CAS — ACFFAA</p>
        </div>

        <div class="space-y-5">
          <div>
            <label class="label-field">N° Documento (DNI o Carnet de Extranjería)</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-gray-400">👤</span>
              <input
                [formControl]="form.controls.username"
                type="text" placeholder="Ej: DNI12345678"
                class="input-field pl-10"
                (keydown.enter)="onLogin()" />
            </div>
            @if (form.controls.username.touched && form.controls.username.errors) {
              <span class="error-text">Ingrese su N° de documento</span>
            }
          </div>

          <div>
            <label class="label-field">Contraseña</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-gray-400">🔒</span>
              <input
                [formControl]="form.controls.password"
                type="password" placeholder="Contraseña"
                class="input-field pl-10"
                (keydown.enter)="onLogin()" />
            </div>
            @if (form.controls.password.touched && form.controls.password.errors) {
              <span class="error-text">Ingrese su contraseña</span>
            }
          </div>

          @if (errorMsg()) {
            <div class="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {{ errorMsg() }}
            </div>
          }

          <div class="flex gap-3">
            <button
              (click)="onLogin()"
              [disabled]="loading()"
              class="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
              @if (loading()) { <span class="animate-spin">⟳</span> }
              Ingresar
            </button>
            <a routerLink="/portal/registro"
              class="flex-1 btn-secondary text-center flex items-center justify-center gap-2">
              Registrarse
            </a>
          </div>

          <div class="text-center space-y-2 pt-2">
            <a href="#" class="text-sm text-[#1F2133] hover:underline block">¿Olvidó su contraseña?</a>
            <a href="#" class="text-sm text-[#1F2133] hover:underline block">Guía del Postulante</a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  loading = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  onLogin(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');

    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Bienvenido al sistema');
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else {
          this.auth.redirectByRole();
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || 'Credenciales incorrectas');
      },
    });
  }
}
