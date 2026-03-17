import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth/auth.interceptor';
import { errorInterceptor } from './http/error.interceptor';

/**
 * Providers centralizados del core — se importan en app.config.ts
 * SAD §5.1: Interceptors JWT (Bearer auto-inject + 401 refresh) + error handling
 */
export const coreProviders = [
  provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
];
