import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';
import { ActaComponent } from '../pages/acta/acta.component';

export const actaCanDeactivateGuard: CanDeactivateFn<ActaComponent> = (
  component,
): boolean | Observable<boolean> => component.confirmLeave();
