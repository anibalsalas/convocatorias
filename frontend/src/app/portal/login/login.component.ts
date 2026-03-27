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
    <!-- Split screen layout — flex-1 + overflow-hidden elimina scroll -->
    <div class="flex-1 flex w-full overflow-hidden min-h-0">

      <!-- Panel izquierdo — Branding institucional -->
      <div class="hidden lg:flex flex-col justify-between w-[60%] relative overflow-hidden px-12 py-6 min-h-0"
           style="background: linear-gradient(160deg, rgba(13,27,42,0.93) 0%, rgba(30,58,95,0.80) 60%, rgba(13,43,69,0.88) 100%), url('/assets/images/fondo.jpeg'); background-size: cover; background-position: center;">

        <!-- Línea dorada superior -->
        <div class="absolute top-0 left-0 right-0 h-1" style="background: #C9A84C;"></div>

        <!-- Escudo + identidad -->
        <div class="flex items-center gap-3">
          <img src="/assets/images/header.png" alt="ACFFAA" class="h-10 w-10 object-contain" />
          <div>
            <p class="text-white text-xs font-semibold tracking-widest uppercase opacity-80">ACFFAA</p>
            <p class="text-white text-xs opacity-50">Ministerio de Defensa del Perú</p>
          </div>
        </div>

        <!-- Contenido central hero -->
        <div class="flex-1 flex flex-col justify-center py-6">
          <!-- Sello decorativo -->
          <div class="mb-4 opacity-10 select-none" style="font-size: 110px; line-height:1; text-align:left;">⚜</div>
          <div style="margin-top: -96px;">
            <p class="text-xs font-bold tracking-[0.3em] uppercase mb-2" style="color: #C9A84C;">
              
            </p>
            <h1 class="text-4xl font-black text-white leading-tight mb-3">
              Proceso CAS<br/>
              <span style="color: #C9A84C;">Transparente</span><br/>
              y Digital
            </h1>
            <p class="text-blue-200 text-sm leading-relaxed max-w-sm opacity-80">
              Gestión integral de convocatorias bajo el régimen CAS,
              conforme a la normativa SERVIR y el D.Leg. 1057.
            </p>
          </div>

          <!-- Píldoras de valor -->
          <div class="flex flex-col gap-2 mt-6">
            @for (v of valores; track v.label) {
              <div class="flex items-center gap-3">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                     style="background: #C9A84C; color: #0D1B2A;">✓</div>
                <span class="text-sm text-blue-100 opacity-80">{{ v.label }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Footer izquierdo -->
        <p class="text-xs text-blue-200 opacity-40">
          ACFFAA — Agencia de Compras de las Fuerzas Armadas · {{ anio }}
        </p>
      </div>

      <!-- Panel derecho — Formulario -->
      <div class="flex flex-col justify-center flex-1 px-8 md:px-14 py-4 bg-white overflow-y-auto min-h-0">

        <!-- Logo móvil (solo cuando panel izquierdo no es visible) -->
        <div class="lg:hidden flex items-center gap-2 mb-10">
          <img src="/assets/images/header.png" alt="ACFFAA" class="h-8 w-8 object-contain" />
          <span class="text-xs font-semibold text-gray-500 tracking-wide uppercase">ACFFAA · SISCONV</span>
        </div>

        <div class="w-full max-w-sm mx-auto">
          <!-- Saludo -->
          <p class="text-sm font-medium mb-1" style="color: #C9A84C;">Bienvenido</p>
          <h2 class="text-3xl font-black mb-1" style="color: #1E3A5F;">Iniciar sesión</h2>
          <p class="text-xs text-gray-400 mb-8">Sistema de Convocatorias CAS — ACFFAA</p>

          <!-- Campos -->
          <div class="space-y-4">
            <!-- DNI -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                N° Documento / Usuario
              </label>
              <div class="relative">
                <svg class="absolute left-3 top-3 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <input
                  [formControl]="form.controls.username"
                  type="text"
                  placeholder="Ej: 44595846"
                  maxlength="20"
                  class="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg outline-none transition-all"
                  style="border-color: #E2E8F0; color: #1F2133;"
                  [style.border-color]="form.controls.username.touched && form.controls.username.errors ? '#EF4444' : focusDni() ? '#1E3A5F' : '#E2E8F0'"
                  [style.box-shadow]="focusDni() ? '0 0 0 3px rgba(30,58,95,0.08)' : 'none'"
                  (focus)="focusDni.set(true)"
                  (blur)="focusDni.set(false)"
                  (input)="sanitizarUsername($event)"
                  (keydown.enter)="onLogin()" />
              </div>
              @if (form.controls.username.touched && form.controls.username.errors) {
                <p class="text-xs text-red-500 mt-1">Ingrese su N° de documento</p>
              }
            </div>

            <!-- Contraseña -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Contraseña
              </label>
              <div class="relative">
                <svg class="absolute left-3 top-3 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <input
                  [formControl]="form.controls.password"
                  [type]="mostrarPassword() ? 'text' : 'password'"
                  placeholder="Contraseña"
                  class="w-full pl-10 pr-10 py-2.5 text-sm border rounded-lg outline-none transition-all"
                  style="border-color: #E2E8F0; color: #1F2133;"
                  [style.border-color]="form.controls.password.touched && form.controls.password.errors ? '#EF4444' : focusPass() ? '#1E3A5F' : '#E2E8F0'"
                  [style.box-shadow]="focusPass() ? '0 0 0 3px rgba(30,58,95,0.08)' : 'none'"
                  (focus)="focusPass.set(true)"
                  (blur)="focusPass.set(false)"
                  (keydown.enter)="onLogin()" />
                <!-- Toggle mostrar/ocultar -->
                <button type="button"
                  (click)="mostrarPassword.set(!mostrarPassword())"
                  class="absolute right-3 top-2.5 text-gray-300 hover:text-gray-500 transition-colors text-sm">
                  {{ mostrarPassword() ? '🙈' : '👁' }}
                </button>
              </div>
              @if (form.controls.password.touched && form.controls.password.errors) {
                <p class="text-xs text-red-500 mt-1">Ingrese su contraseña</p>
              }
            </div>

            <!-- Error mensaje -->
            @if (errorMsg()) {
              <div class="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2.5 rounded-lg">
                <span class="text-base leading-none">⚠</span>
                <span>{{ errorMsg() }}</span>
              </div>
            }

            <!-- CTA Principal -->
            <button
              (click)="onLogin()"
              [disabled]="loading()"
              class="w-full py-3 rounded-lg text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
              style="background: #1E3A5F;"
              [style.background]="loading() ? '#2D5F8A' : '#1E3A5F'">
              @if (loading()) {
                <span class="animate-spin inline-block">⟳</span>
                Verificando...
              } @else {
                Ingresar →
              }
            </button>

            <!-- CTA Secundario -->
            <a routerLink="/portal/registro"
               class="w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-all duration-200 block border-2"
               style="color: #C9A84C; border-color: #C9A84C;"
               [style.background]="'transparent'">
              Registrarme como postulante
            </a>

            <!-- Links auxiliares -->
            <div class="flex items-center justify-center gap-4 pt-1">
              <a routerLink="/portal/recuperar-contrasena" class="text-xs text-gray-400 hover:text-gray-600 transition-colors">¿Olvidó su contraseña?</a>
              <span class="text-gray-200">·</span>
              <a href="#" class="text-xs text-gray-400 hover:text-gray-600 transition-colors">Guía del Postulante</a>
            </div>

            <!-- Trust signal -->
            <div class="flex items-center justify-center gap-1.5 pt-2">
              <svg class="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
              </svg>
              <span class="text-xs text-gray-300">Conexión segura · SISCONV {{ anio }}</span>
            </div>
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
  focusDni = signal(false);
  focusPass = signal(false);
  mostrarPassword = signal(false);
  readonly anio = new Date().getFullYear();
  readonly valores = [
    { label: 'Proceso 100% digital y trazable' },
    { label: 'Transparencia normativa SERVIR · D.Leg. 1057' },
    { label: 'Meritocracia garantizada en cada etapa' },
  ];

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9.]{4,20}$/)]],
    password: ['', [Validators.required]],
  });

  sanitizarUsername(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^A-Za-z0-9.]/g, '').toLowerCase().slice(0, 20);
    input.value = limpio;
    this.form.controls.username.setValue(limpio, { emitEvent: false });
  }

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
