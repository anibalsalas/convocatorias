import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    const returnUrl = route.url.map(s => s.path).join('/');
    router.navigate(['/portal/login'], { queryParams: { returnUrl } });
    return false;
  }

  const requiredRoles = route.data['roles'] as string[] | undefined;
  if (requiredRoles && requiredRoles.length > 0) {
    if (!auth.hasAnyRole(requiredRoles)) {
      auth.redirectByRole();
      return false;
    }
  }

  return true;
};

export const publicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) {
    auth.redirectByRole();
    return false;
  }
  return true;
};
