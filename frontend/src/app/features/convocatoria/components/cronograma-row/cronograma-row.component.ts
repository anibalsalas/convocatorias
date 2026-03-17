import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

/**
 * Presentational component: fila editable de actividad del cronograma.
 * Rules §2.3: Dumb component — solo renderiza y emite eventos.
 */
@Component({
  selector: 'app-cronograma-row',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg" [formGroup]="group()">
      <div class="col-span-2">
        <select formControlName="etapa" class="input-field text-xs" aria-label="Etapa">
          <option value="CONVOCATORIA">Convocatoria</option>
          <option value="POSTULACION">Postulación</option>
          <option value="EVALUACION_CURRICULAR">Eval. Curricular</option>
          <option value="EVALUACION_TECNICA">Eval. Técnica</option>
          <option value="ENTREVISTA">Entrevista</option>
          <option value="RESULTADOS">Resultados</option>
          <option value="SUSCRIPCION">Suscripción</option>
        </select>
      </div>
      <div class="col-span-3">
        <input formControlName="actividad" class="input-field text-xs" placeholder="Descripción de la actividad" />
      </div>
      <div class="col-span-2">
        <input formControlName="fechaInicio" type="date" class="input-field text-xs" />
      </div>
      <div class="col-span-2">
        <input formControlName="fechaFin" type="date" class="input-field text-xs" />
      </div>
      <div class="col-span-2">
        <input formControlName="responsable" class="input-field text-xs" placeholder="Responsable" />
      </div>
      <div class="col-span-1 flex justify-center pt-1">
        <button type="button" (click)="remove.emit()" class="text-red-500 hover:text-red-700 text-sm" title="Eliminar">✕</button>
      </div>
    </div>
  `,
})
export class CronogramaRowComponent {
  group = input.required<FormGroup>();
  remove = output<void>();
}
