import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

/**
 * Presentational component: card de miembro del comité.
 * Rules §2.3: Dumb component — solo renderiza y emite eventos.
 */
@Component({
  selector: 'app-miembro-comite-card',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card space-y-3" [formGroup]="group()">
      <div class="flex items-center justify-between gap-3">
        <div class="w-10 h-10 rounded-full bg-[#1F2133] text-white flex items-center justify-center font-bold text-sm shrink-0">
          {{ roleInitial() }}
        </div>
        <div class="flex-1">
          <select formControlName="rolComite" class="input-field text-xs font-semibold" aria-label="Rol en el comité">
            <option value="PRESIDENTE">Presidente</option>
            <option value="SECRETARIO">Secretario</option>
            <option value="VOCAL">Vocal</option>
          </select>
        </div>
        @if (canRemove()) {
          <button type="button" (click)="remove.emit()" class="text-red-500 hover:text-red-700 text-sm" title="Eliminar miembro">✕</button>
        }
      </div>
      <input formControlName="nombresCompletos" class="input-field" maxlength="150" placeholder="Nombres y apellidos completos" />
      <input formControlName="cargo" class="input-field" maxlength="120" placeholder="Ej. Director de RRHH" />
      <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input type="checkbox" formControlName="esTitular" class="accent-[#1F2133]" />
        Miembro titular
      </label>
    </div>
  `,
})
export class MiembroComiteCardComponent {
  group = input.required<FormGroup>();
  canRemove = input<boolean>(true);
  remove = output<void>();

  roleInitial(): string {
    const role = this.group().get('rolComite')?.value as string;
    return role ? role.charAt(0) : '?';
  }
}
