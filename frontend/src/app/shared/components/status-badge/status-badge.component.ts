import { Component, ChangeDetectionStrategy, input } from '@angular/core';

const BADGE_MAP: Record<string, string> = {
  REGISTRADO: 'badge-info', VERIFICADO: 'badge-info-dark', APTO: 'badge-success',
  NO_APTO: 'badge-danger', DESCALIFICADO: 'badge-danger-dark', GANADOR: 'badge-gold',
  ACCESITARIO: 'badge-warning', NO_SELECCIONADO: 'badge-neutral',
  EN_ELABORACION: 'badge-warning', APROBADA: 'badge-success', PUBLICADA: 'badge-info', NUEVO: 'badge-nuevo',
  EN_SELECCION: 'badge-active', DESIERTA: 'badge-neutral-dark', FINALIZADA: 'badge-success-dark',
  CANCELADA: 'badge-danger',
  ELABORADO: 'badge-warning', CON_PRESUPUESTO: 'badge-success', SIN_PRESUPUESTO: 'badge-danger',
  CONFIGURADO: 'badge-info',
  NOTIFICADO: 'badge-info', DOCS_VERIFICADOS: 'badge-info-dark', SUSCRITO: 'badge-success',
  EN_PLANILLA: 'badge-warning', CERRADO: 'badge-success-dark', CANCELADO: 'badge-danger',
  PRESENTADA: 'badge-warning', FUNDADA: 'badge-danger', INFUNDADA: 'badge-success',
  ACTIVO: 'badge-success', INACTIVO: 'badge-neutral', BLOQUEADO: 'badge-danger',
  PENDIENTE: 'badge-warning', VALIDADO: 'badge-info',
};

const DISPLAY_LABEL_MAP: Record<string, string> = {
  EN_SELECCION: 'EN SELECCION',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="cssClass()">{{ displayLabel() }}</span>`,
})
export class StatusBadgeComponent {
  estado = input.required<string>();
  label = input<string>();

  cssClass(): string {
    return BADGE_MAP[this.estado()] ?? 'badge-neutral';
  }

  displayLabel(): string {
    const raw = this.label() ?? this.estado();
    return DISPLAY_LABEL_MAP[raw] ?? raw;
  }
}
