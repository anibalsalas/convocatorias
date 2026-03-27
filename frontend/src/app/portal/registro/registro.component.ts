import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { RegisterPostulanteRequest } from '@core/auth/auth.models';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex-1 flex flex-col min-h-0' },
  template: `
    <div class="flex-1 flex w-full overflow-hidden min-h-0">

      <!-- Panel izquierdo — Branding (espejo del login) -->
      <div class="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden px-10 py-6 min-h-0"
           style="background: linear-gradient(160deg, rgba(13,27,42,0.93) 0%, rgba(30,58,95,0.80) 60%, rgba(13,43,69,0.88) 100%), url('/assets/images/fondo.jpeg'); background-size: cover; background-position: center;">
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
          <div class="mb-3 opacity-10 select-none" style="font-size: 90px; line-height:1;">⚜</div>
          <div style="margin-top: -78px;">
            <p class="text-xs font-bold tracking-[0.3em] uppercase mb-2" style="color: #C9A84C;">
              Postulante CAS
            </p>
            <h1 class="text-3xl font-black text-white leading-tight mb-3">
              Únete al<br/>
              <span style="color: #C9A84C;">proceso</span><br/>
              meritocrático
            </h1>
            <p class="text-blue-200 text-xs leading-relaxed max-w-xs opacity-80">
              Crea tu cuenta y postula a convocatorias CAS de la ACFFAA de forma
              100% digital, transparente y trazable.
            </p>
          </div>
          <div class="flex flex-col gap-2 mt-5">
            @for (v of beneficios; track v) {
              <div class="flex items-center gap-2.5">
                <div class="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                     style="background: #C9A84C; color: #0D1B2A; font-size: 9px;">✓</div>
                <span class="text-xs text-blue-100 opacity-80">{{ v }}</span>
              </div>
            }
          </div>
        </div>

        <p class="text-xs text-blue-200 opacity-40">ACFFAA · {{ anio }}</p>
      </div>

      <!-- Panel derecho — Formulario compacto -->
      <div class="flex flex-col justify-center flex-1 px-8 md:px-12 py-2 bg-white overflow-y-auto min-h-0">
        <div class="w-full max-w-lg mx-auto">

          <!-- Encabezado -->
          <p class="text-xs font-bold mb-0.5" style="color: #C9A84C;">Nueva cuenta</p>
          <h2 class="text-xl font-black mb-0.5" style="color: #1E3A5F;">Registro de Postulante</h2>
          <p class="text-xs text-gray-400 mb-3">Complete sus datos personales para postular a convocatorias CAS</p>

          <!-- Formulario compacto -->
          <div class="space-y-2">

            <!-- Fila 1: Tipo doc + N° documento -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Tipo Documento</label>
                <select [formControl]="form.controls.tipoDocumento"
                        class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#1E3A5F] transition-colors"
                        (change)="onTipoDocumentoChange()">
                  <option value="DNI">DNI</option>
                  
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">N° Documento *</label>
                <input [formControl]="form.controls.numeroDocumento"
                       class="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors"
                       [class.border-red-300]="form.controls.numeroDocumento.touched && form.controls.numeroDocumento.errors"
                       [class.border-gray-200]="!(form.controls.numeroDocumento.touched && form.controls.numeroDocumento.errors)"
                       placeholder="12345678"
                       [attr.maxlength]="isDni() ? 8 : 12"
                       [attr.inputmode]="isDni() ? 'numeric' : 'text'"
                       autocomplete="off"
                       (keypress)="onDocKeyPress($event)"
                       (paste)="onDocPaste($event)"
                       (input)="onDocInput()" />
                @if (form.controls.numeroDocumento.touched && form.controls.numeroDocumento.errors) {
                  <p class="text-[10px] text-red-500 mt-0.5">{{ isDni() ? 'DNI: 8 dígitos exactos' : 'CE: 8-12 alfanumérico' }}</p>
                }
              </div>
            </div>

            <!-- Fila 2: Nombres -->
            <div>
              <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Nombres *</label>
              <input [formControl]="form.controls.nombres"
                     class="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors"
                     [class.border-red-300]="form.controls.nombres.touched && form.controls.nombres.errors"
                     [class.border-gray-200]="!(form.controls.nombres.touched && form.controls.nombres.errors)"
                     placeholder="Juan Carlos" maxlength="100" />
              @if (form.controls.nombres.touched && form.controls.nombres.errors) {
                <p class="text-[10px] text-red-500 mt-0.5">Requerido</p>
              }
            </div>

            <!-- Fila 3: Apellidos -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Apellido Paterno *</label>
                <input [formControl]="form.controls.apellidoPaterno"
                       class="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors"
                       [class.border-red-300]="form.controls.apellidoPaterno.touched && form.controls.apellidoPaterno.errors"
                       [class.border-gray-200]="!(form.controls.apellidoPaterno.touched && form.controls.apellidoPaterno.errors)"
                       placeholder="Pérez" maxlength="50" />
                @if (form.controls.apellidoPaterno.touched && form.controls.apellidoPaterno.errors) {
                  <p class="text-[10px] text-red-500 mt-0.5">Requerido</p>
                }
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Apellido Materno *</label>
                <input [formControl]="form.controls.apellidoMaterno"
                       class="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors"
                       [class.border-red-300]="form.controls.apellidoMaterno.touched && form.controls.apellidoMaterno.errors"
                       [class.border-gray-200]="!(form.controls.apellidoMaterno.touched && form.controls.apellidoMaterno.errors)"
                       placeholder="López" maxlength="50" />
                @if (form.controls.apellidoMaterno.touched && form.controls.apellidoMaterno.errors) {
                  <p class="text-[10px] text-red-500 mt-0.5">Requerido</p>
                }
              </div>
            </div>

            <!-- Fila 4: Email + Teléfono -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Email *</label>
                <input [formControl]="form.controls.email" type="email"
                       class="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors"
                       [class.border-red-300]="form.controls.email.touched && form.controls.email.errors"
                       [class.border-gray-200]="!(form.controls.email.touched && form.controls.email.errors)"
                       placeholder="correo@mail.com" maxlength="200" />
                @if (form.controls.email.touched && form.controls.email.errors) {
                  <p class="text-[10px] text-red-500 mt-0.5">Email inválido</p>
                }
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Teléfono</label>
                <input [formControl]="form.controls.telefono"
                       class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#1E3A5F] transition-colors"
                       placeholder="999888777" maxlength="20" />
              </div>
            </div>

            <!-- Fila 5: Contraseñas -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Contraseña *</label>
                <div class="relative">
                  <input [formControl]="form.controls.password"
                         [type]="showPassword() ? 'text' : 'password'"
                         class="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#1E3A5F] transition-colors"
                         placeholder="Mín. 8 caracteres" maxlength="100" />
                  <button type="button" (click)="showPassword.set(!showPassword())"
                          class="absolute right-2 top-1.5 text-gray-300 hover:text-gray-500 text-sm">
                    {{ showPassword() ? '🙈' : '👁' }}
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Confirmar *</label>
                <div class="relative">
                  <input [formControl]="form.controls.passwordConfirm"
                         [type]="showPasswordConfirm() ? 'text' : 'password'"
                         class="w-full px-3 py-2 pr-8 text-sm border rounded-lg outline-none focus:border-[#1E3A5F] transition-colors"
                         [class.border-red-300]="form.errors?.['passwordMismatch'] && form.controls.passwordConfirm.touched"
                         [class.border-gray-200]="!(form.errors?.['passwordMismatch'] && form.controls.passwordConfirm.touched)"
                         placeholder="Repetir contraseña" maxlength="100" />
                  <button type="button" (click)="showPasswordConfirm.set(!showPasswordConfirm())"
                          class="absolute right-2 top-1.5 text-gray-300 hover:text-gray-500 text-sm">
                    {{ showPasswordConfirm() ? '🙈' : '👁' }}
                  </button>
                </div>
                @if (form.errors?.['passwordMismatch'] && form.controls.passwordConfirm.touched) {
                  <p class="text-[10px] text-red-500 mt-0.5">No coinciden</p>
                }
              </div>
            </div>

            <!-- Error global -->
            @if (errorMsg()) {
              <div class="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2 rounded-lg">
                <span>⚠</span><span>{{ errorMsg() }}</span>
              </div>
            }

            <!-- Info usuario -->
            <div class="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-lg">
              <span class="opacity-60">ℹ</span>
              <span>Su usuario será: <strong class="font-mono">{{ form.controls.numeroDocumento.value || '...' }}</strong></span>
            </div>

            <!-- CTA -->
            <button (click)="onRegister()" [disabled]="loading()"
                    class="w-full py-2 rounded-lg text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                    style="background: #1E3A5F;">
              @if (loading()) { <span class="animate-spin">⟳</span> Creando cuenta... }
              @else { Crear cuenta y continuar → }
            </button>

            <!-- Link login -->
            <p class="text-center text-xs text-gray-400">
              ¿Ya tiene cuenta?
              <a routerLink="/portal/login" class="font-semibold hover:underline" style="color: #1E3A5F;">Iniciar sesión</a>
            </p>

          </div>
        </div>
      </div>
    </div>
  `,
})
export class RegistroComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  loading = signal(false);
  errorMsg = signal('');
  showPassword = signal(false);
  showPasswordConfirm = signal(false);
  readonly anio = new Date().getFullYear();
  readonly beneficios = [
    'Postula desde cualquier dispositivo',
    'Seguimiento en tiempo real de tu expediente',
    'Notificaciones automáticas en cada etapa',
  ];

  form = this.fb.nonNullable.group({
    tipoDocumento: ['DNI'],
    numeroDocumento: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(12)]],
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidoPaterno: ['', [Validators.required, Validators.maxLength(50)]],
    apellidoMaterno: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    telefono: ['', [Validators.maxLength(20)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    passwordConfirm: ['', [Validators.required, Validators.maxLength(100)]],
  }, { validators: [this.passwordMatchValidator] });

  isDni(): boolean {
    return this.form.controls.tipoDocumento.value === 'DNI';
  }

  onTipoDocumentoChange(): void {
    this.form.controls.numeroDocumento.setValue('');
    this.form.controls.numeroDocumento.markAsPristine();
  }

  onDocKeyPress(evt: KeyboardEvent): void {
    if (!this.isDni()) return;

    const key = evt.key;
    const allowedControl = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (allowedControl.includes(key)) return;

    if (!/^\d$/.test(key)) evt.preventDefault();

    const current = this.form.controls.numeroDocumento.value ?? '';
    if (current.length >= 8) evt.preventDefault();
  }

  onDocPaste(evt: ClipboardEvent): void {
    if (!this.isDni()) return;

    const pasted = evt.clipboardData?.getData('text') ?? '';
    const digitsOnly = pasted.replace(/\D+/g, '').slice(0, 8);

    evt.preventDefault();
    this.form.controls.numeroDocumento.setValue(digitsOnly);
    this.form.controls.numeroDocumento.markAsDirty();
  }

  onDocInput(): void {
    if (!this.isDni()) return;

    const current = this.form.controls.numeroDocumento.value ?? '';
    const digitsOnly = current.replace(/\D+/g, '').slice(0, 8);
    if (digitsOnly !== current) {
      this.form.controls.numeroDocumento.setValue(digitsOnly, { emitEvent: false });
    }
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const pw = control.get('password')?.value;
    const pc = control.get('passwordConfirm')?.value;
    return pw && pc && pw !== pc ? { passwordMismatch: true } : null;
  }

  private upper(s: string): string { return s.trim().toUpperCase(); }
  private lower(s: string): string { return s.trim().toLowerCase(); }

  onRegister(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Complete todos los campos obligatorios.');
      return;
    }

    // ✅ Reglas DNI exactas (no permite registrar si < 8 o > 8)
    const doc = this.form.controls.numeroDocumento.value;
    if (this.isDni() && !/^\d{8}$/.test(doc)) {
      this.errorMsg.set('DNI debe tener exactamente 8 dígitos.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    const val = this.form.getRawValue();

    const req: RegisterPostulanteRequest = {
      tipoDocumento: this.upper(val.tipoDocumento) as 'DNI' | 'CE',
      numeroDocumento: this.upper(val.numeroDocumento),
      nombres: this.upper(val.nombres),
      apellidoPaterno: this.upper(val.apellidoPaterno),
      apellidoMaterno: this.upper(val.apellidoMaterno),
      email: this.lower(val.email),
      telefono: val.telefono?.trim(),
      password: val.password,
      passwordConfirm: val.passwordConfirm,
    };

    this.auth.register(req).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Cuenta creada exitosamente. Bienvenido.');

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/portal/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.error || err.error?.message || 'Error al crear la cuenta');
      },
    });
  }
}