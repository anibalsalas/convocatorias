import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DialogModule } from '@angular/cdk/dialog';
import { routes } from './app.routes';
import { authInterceptor } from '@core/auth/auth.interceptor';
import { errorInterceptor } from '@core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    importProvidersFrom(DialogModule),
  ],
};
