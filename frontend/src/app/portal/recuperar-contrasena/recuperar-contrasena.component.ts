import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'app-recuperar-contrasena',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex-1 flex flex-col min-h-0' },
  template: `
    <div class="flex-1 flex w-full overflow-hidden min-h-0">

      <!-- Panel izquierdo — Branding (espejo del login) -->
      <div class="hidden lg:flex flex-col justify-between w-[55%] relative overflow-hidden px-12 py-6 min-h-0"
           style="background: linear-gradient(160deg, #0D1B2A 0%, #1E3A5F 60%, #0D2B45 100%);">
        <div class="absolute top-0 left-0 right-0 h-1" style="background: #C9A84C;"></div>

        <!-- Logo -->
        <div class="flex items-center gap-3">
          <img src="/assets/images/header.png" alt="ACFFAA" class="h-10 w-10 object-contain" />
          <div>
            <p class="text-white text-xs font-semibold tracking-widest uppercase opacity-80">ACFFAA</p>
            <p class="text-white text-xs opacity-50">Ministerio de Defensa del Perú</p>
          </div>
        </div>

        <!-- Hero -->
        <div class="flex-1 flex flex-col justify-center py-4">
          <div class="mb-3 opacity-10 select-none" style="font-size: 100px; line-height:1;">🔑</div>
          <div style="margin-top: -86px;">
            <p class="text-xs font-bold tracking-[0.3em] uppercase mb-2" style="color: #C9A84C;">
              Acceso seguro
            </p>
            <h1 class="text-3xl font-black text-white leading-tight mb-3">
              Recupera tu<br/>
              <span style="color: #C9A84C;">acceso</span><br/>
              al sistema
            </h1>
            <p class="text-blue-200 text-xs leading-relaxed max-w-xs opacity-80">
              Ingresa tu número de documento y recibirás una contraseña
              temporal en el correo registrado en el sistema.
            </p>
          </div>
          <div class="flex flex-col gap-2 mt-6">
            @for (tip of tips; track tip) {
              <div class="flex items-center gap-2.5">
                <div class="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                     style="background: rgba(201,168,76,0.15); border: 1px solid #C9A84C;">
                  <span style="color: #C9A84C; font-size: 9px; font-weight: bold;">i</span>
                </div>
                <span class="text-xs text-blue-100 opacity-80">{{ tip }}</span>
              </div>
            }
          </div>
        </div>

        <p class="text-xs text-blue-200 opacity-40">ACFFAA · {{ anio }}</p>
      </div>

      <!-- Panel derecho — Formulario / Éxito -->
      <div class="flex flex-col justify-center flex-1 px-8 md:px-14 py-6 bg-white overflow-y-auto min-h-0">
        <div class="w-full max-w-sm mx-auto">

          @if (!enviado()) {
            <!-- Estado 1: Formulario -->
            <p class="text-xs font-bold mb-0.5" style="color: #C9A84C;">Recuperar acceso</p>
            <h2 class="text-2xl font-black mb-1" style="color: #1E3A5F;">Olvidé mi contraseña</h2>
            <p class="text-xs text-gray-400 mb-6 leading-relaxed">
              Ingrese su número de documento (DNI o Carnet de Extranjería)
              y le enviaremos una contraseña temporal a su correo registrado.
            </p>

            <div class="space-y-4">
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  N° Documento *
                </label>
                <div class="relative">
                  <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  <input
                    [formControl]="form.controls.numeroDocumento"
                    type="text"
                    placeholder="Ej: 12345678"
                    class="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg outline-none transition-all"
                    [class.border-red-300]="form.controls.numeroDocumento.touched && form.controls.numeroDocumento.errors"
                    [class.border-gray-200]="!(form.controls.numeroDocumento.touched && form.controls.numeroDocumento.errors)"
                    style="color: #1F2133;"
                    (keydown.enter)="onRecuperar()" />
                </div>
                @if (form.controls.numeroDocumento.touched && form.controls.numeroDocumento.errors) {
                  <p class="text-xs text-red-500 mt-1">Ingrese su número de documento</p>
                }
              </div>

              @if (errorMsg()) {
                <div class="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2.5 rounded-lg">
                  <span>⚠</span><span>{{ errorMsg() }}</span>
                </div>
              }

              <button
                (click)="onRecuperar()"
                [disabled]="loading()"
                class="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                style="background: #1E3A5F;">
                @if (loading()) {
                  <span class="animate-spin inline-block">⟳</span> Enviando...
                } @else {
                  Recuperar acceso →
                }
              </button>

              <p class="text-center text-xs text-gray-400 pt-1">
                <a routerLink="/portal/login" class="font-semibold hover:underline" style="color: #1E3A5F;">
                  ← Volver al inicio de sesión
                </a>
              </p>
            </div>

          } @else {
            <!-- Estado 2: Éxito -->
            <div class="text-center space-y-4">
              <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-2"
                   style="background: #D1FAE5;">
                <svg class="w-8 h-8" style="color: #065F46;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              </div>

              <div>
                <h2 class="text-xl font-black mb-1" style="color: #1E3A5F;">Contraseña enviada</h2>
                <p class="text-xs text-gray-500 leading-relaxed">
                  Hemos enviado una contraseña temporal a:
                </p>
                <p class="text-sm font-mono font-bold mt-2 px-4 py-2 rounded-lg inline-block"
                   style="background: #F0FDF4; color: #065F46; border: 1px solid #BBF7D0;">
                  {{ emailMasked() }}
                </p>
              </div>

              <div class="bg-amber-50 border border-amber-100 text-amber-700 text-xs px-4 py-3 rounded-lg text-left space-y-1">
                <p class="font-semibold">Pasos a seguir:</p>
                <p>1. Revise su bandeja de entrada (y spam)</p>
                <p>2. Inicie sesión con la contraseña temporal</p>
                <p>3. Cambie su contraseña desde Mi Perfil</p>
              </div>

              <a routerLink="/portal/login"
                 class="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2"
                 style="background: #1E3A5F;">
                Ir a iniciar sesión →
              </a>

              <p class="text-xs text-gray-400">
                ¿No llegó el correo?
                <button (click)="reiniciar()" class="font-semibold hover:underline" style="color: #1E3A5F;">
                  Intentar de nuevo
                </button>
              </p>
            </div>
          }

        </div>
      </div>
    </div>
  `,
})
export class RecuperarContrasenaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly loading = signal(false);
  readonly enviado = signal(false);
  readonly errorMsg = signal('');
  readonly emailMasked = signal('su correo registrado');
  readonly anio = new Date().getFullYear();

  readonly tips = [
    'Debe estar previamente registrado en el sistema',
    'La contraseña temporal llegará a su correo registrado',
    'Cámbiela desde Mi Perfil tras iniciar sesión',
  ];

  readonly form = this.fb.nonNullable.group({
    numeroDocumento: ['', [Validators.required, Validators.minLength(8)]],
  });

  onRecuperar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.loading()) return;

    this.loading.set(true);
    this.errorMsg.set('');

    const body = { numeroDocumento: this.form.controls.numeroDocumento.value.trim() };

    this.http.post<{ data: string; message: string }>(
      `${environment.apiUrl}/auth/recuperar-contrasena`, body
    ).subscribe({
      next: (res) => {
        this.emailMasked.set(res.data ?? 'su correo registrado');
        this.enviado.set(true);
        this.loading.set(false);
      },
      error: () => {
        // Por seguridad, igual mostramos éxito aunque falle
        this.emailMasked.set('su correo registrado');
        this.enviado.set(true);
        this.loading.set(false);
      },
    });
  }

  reiniciar(): void {
    this.enviado.set(false);
    this.errorMsg.set('');
    this.form.reset();
  }
}
