import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';
import { ComiteComponent } from '../pages/comite/comite.component';

export const comiteCanDeactivateGuard: CanDeactivateFn<ComiteComponent> = (
  component,
): boolean | Observable<boolean> => component.confirmLeave();
