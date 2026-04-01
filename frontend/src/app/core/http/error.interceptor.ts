import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '@core/services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // El login maneja sus propios errores inline — no mostrar Toast duplicado
      if (req.url.includes('/auth/login')) {
        return throwError(() => error);
      }

      const apiMessage =
        (typeof error.error?.error === 'string' && error.error.error.trim()
          ? error.error.error
          : null) ??
        (typeof error.error?.message === 'string' && error.error.message.trim()
          ? error.error.message
          : null);

      if (error.status === 0) {
        toast.error('Sin conexión al servidor');
      } else if (error.status === 403) {
        toast.error(apiMessage ?? 'No tiene permisos para esta acción');
      } else if (error.status === 404) {
        // 404 se maneja silenciosamente en cada componente (recurso aún no creado)
      } else if (error.status === 409) {
        toast.error(apiMessage ?? 'El registro ya existe');
      } else if (error.status >= 400 && error.status < 500 && error.status !== 401) {
        toast.error(apiMessage ?? 'Error en la solicitud');
      } else if (error.status >= 500) {
        toast.error(apiMessage ?? 'Error interno del servidor. Intente nuevamente.');
      }

      return throwError(() => error);
    }),
  );
};