import { Injectable } from '@angular/core';
import { isObservable, Observable, take } from 'rxjs';

/**
 * Permite que pantallas con tareas pendientes intercepcionen logout / salida global
 * (p. ej. botón Salir del layout) con la misma lógica que CanDeactivate.
 */
@Injectable({ providedIn: 'root' })
export class SistemaPendingExitService {
  private checkFn: (() => boolean | Observable<boolean>) | null = null;

  registerCheck(fn: () => boolean | Observable<boolean>): void {
    this.checkFn = fn;
  }

  clearCheck(): void {
    this.checkFn = null;
  }

  /** Ejecuta proceed() solo si no hay check registrado o el check permite salir. */
  attemptExit(proceed: () => void): void {
    const fn = this.checkFn;
    if (!fn) {
      proceed();
      return;
    }
    const r = fn();
    if (r === true) {
      proceed();
      return;
    }
    if (r === false) {
      return;
    }
    if (isObservable(r)) {
      r.pipe(take(1)).subscribe(ok => {
        if (ok) {
          proceed();
        }
      });
    }
  }
}
