import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

/**
 * Presentational component: fila de factor de evaluación.
 * Rules §2.3: Dumb component — solo renderiza y emite eventos.
 */
@Component({
  selector: 'app-factor-row',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg" [formGroup]="group()">
      <div class="col-span-2">
        <select formControlName="etapaEvaluacion" class="input-field text-xs" aria-label="Etapa de evaluación">
          <option value="CURRICULAR">Curricular</option>
          <option value="TECNICA">Técnica</option>
          <option value="ENTREVISTA">Entrevista</option>
        </select>
      </div>
      <div class="col-span-3">
        <input formControlName="criterio" class="input-field text-xs" placeholder="Ej: Formación académica" />
      </div>
      <div class="col-span-2">
        <input formControlName="puntajeMaximo" type="number" class="input-field text-xs" min="0.01" step="0.01" placeholder="Ptj. máx" />
      </div>
      <div class="col-span-2">
        <input formControlName="puntajeMinimo" type="number" class="input-field text-xs" min="0" step="0.01" placeholder="Ptj. mín" />
      </div>
      <div class="col-span-2">
        <input formControlName="pesoCriterio" type="number" class="input-field text-xs" min="0.01" max="100" step="0.01" placeholder="Peso %" />
      </div>
      <div class="col-span-1 flex justify-center pt-1">
        <button type="button" (click)="remove.emit()" class="text-red-500 hover:text-red-700 text-sm" title="Eliminar">✕</button>
      </div>
    </div>
  `,
})
export class FactorRowComponent {
  group = input.required<FormGroup>();
  remove = output<void>();
}
