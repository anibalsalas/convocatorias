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
  template: `
    <div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12"
         style="background: linear-gradient(135deg, #1F2133 0%, #2D5F8A 50%, #1F2133 100%);">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold text-gray-800">Registro de Postulante</h1>
          <p class="text-sm text-gray-500 mt-1">Cree su cuenta para postular a convocatorias CAS</p>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label-field">Tipo documento</label>
              <select [formControl]="form.controls.tipoDocumento" class="input-field" (change)="onTipoDocumentoChange()">
                <option value="DNI">DNI</option>
              </select>
            </div>

            <div>
              <label class="label-field">N° Documento</label>
              <input
                [formControl]="form.controls.numeroDocumento"
                class="input-field"
                placeholder="12345678"
                [attr.maxlength]="isDni() ? 8 : 12"
                [attr.inputmode]="isDni() ? 'numeric' : 'text'"
                [attr.autocomplete]="'off'"
                (keypress)="onDocKeyPress($event)"
                (paste)="onDocPaste($event)"
                (input)="onDocInput()"
              />

              @if (form.controls.numeroDocumento.touched && form.controls.numeroDocumento.errors) {
                <span class="error-text">
                  @if (isDni()) { DNI: 8 dígitos exactos } @else { CE: 8-12 alfanumérico }
                </span>
              }
            </div>
          </div>

          <div>
            <label class="label-field">Nombres</label>
            <input [formControl]="form.controls.nombres" class="input-field" placeholder="Juan Carlos" maxlength="100" />
            @if (form.controls.nombres.touched && form.controls.nombres.errors) {
              <span class="error-text">Requerido (máx 100)</span>
            }
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label-field">Apellido Paterno</label>
              <input [formControl]="form.controls.apellidoPaterno" class="input-field" placeholder="Pérez" maxlength="50" />
              @if (form.controls.apellidoPaterno.touched && form.controls.apellidoPaterno.errors) {
                <span class="error-text">Requerido (máx 50)</span>
              }
            </div>
            <div>
              <label class="label-field">Apellido Materno</label>
              <input [formControl]="form.controls.apellidoMaterno" class="input-field" placeholder="López" maxlength="50" />
              @if (form.controls.apellidoMaterno.touched && form.controls.apellidoMaterno.errors) {
                <span class="error-text">Requerido (máx 50)</span>
              }
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label-field">Email</label>
              <input [formControl]="form.controls.email" type="email" class="input-field" placeholder="correo@mail.com" maxlength="200" />
              @if (form.controls.email.touched && form.controls.email.errors) {
                <span class="error-text">Email inválido</span>
              }
            </div>
            <div>
              <label class="label-field">Teléfono</label>
              <input [formControl]="form.controls.telefono" class="input-field" placeholder="999888777" maxlength="20" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label-field">Contraseña</label>
              <div class="relative">
                <input [formControl]="form.controls.password" [type]="showPassword() ? 'text' : 'password'"
                       class="input-field pr-16" placeholder="Mínimo 8 caracteres" maxlength="100" />
                <button type="button"
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1F2133]"
                        (click)="showPassword.set(!showPassword())">
                  {{ showPassword() ? 'Ocultar' : 'Ver' }}
                </button>
              </div>
            </div>
            <div>
              <label class="label-field">Confirmar contraseña</label>
              <div class="relative">
                <input [formControl]="form.controls.passwordConfirm" [type]="showPasswordConfirm() ? 'text' : 'password'"
                       class="input-field pr-16" placeholder="Repetir contraseña" maxlength="100" />
                <button type="button"
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#1F2133]"
                        (click)="showPasswordConfirm.set(!showPasswordConfirm())">
                  {{ showPasswordConfirm() ? 'Ocultar' : 'Ver' }}
                </button>
              </div>
            </div>
          </div>

          @if (form.errors?.['passwordMismatch'] && form.controls.passwordConfirm.touched) {
            <div class="text-red-500 text-xs">Las contraseñas no coinciden</div>
          }
          @if (errorMsg()) {
            <div class="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{{ errorMsg() }}</div>
          }

          <div class="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-4 py-3 rounded-lg">
            Su usuario será: <strong class="font-mono">{{ form.controls.tipoDocumento.value }}{{ form.controls.numeroDocumento.value }}</strong>
          </div>

          <button (click)="onRegister()" [disabled]="loading()" class="w-full btn-primary disabled:opacity-50">
            @if (loading()) { <span class="animate-spin">⟳</span> }
            Crear cuenta y continuar
          </button>

          <p class="text-center text-sm text-gray-500">
            ¿Ya tiene cuenta?
            <a routerLink="/portal/login" class="text-[#1F2133] font-semibold hover:underline">Iniciar sesión</a>
          </p>
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