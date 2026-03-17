import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@shared/models/api-response.model';
import { LoginRequest, RegisterPostulanteRequest, TokenResponse, UserSession } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;
  private readonly userSignal = signal<UserSession | null>(this.loadSession());

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly roles = computed(() => this.userSignal()?.roles ?? []);
  readonly isPostulante = computed(() => this.roles().includes('ROLE_POSTULANTE'));
  readonly isInternal = computed(() =>
    this.roles().some(r => ['ROLE_ADMIN','ROLE_ORH','ROLE_OPP','ROLE_AREA_SOLICITANTE','ROLE_COMITE'].includes(r))
  );

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<ApiResponse<TokenResponse>> {
    const body: LoginRequest = { username, password };
    return this.http.post<ApiResponse<TokenResponse>>(`${this.api}/auth/login`, body).pipe(
      tap(res => this.handleAuthSuccess(res.data)),
      catchError(err => throwError(() => err))
    );
  }

  register(req: RegisterPostulanteRequest): Observable<ApiResponse<TokenResponse>> {
    return this.http.post<ApiResponse<TokenResponse>>(`${this.api}/auth/register-postulante`, req).pipe(
      tap(res => this.handleAuthSuccess(res.data)),
      catchError(err => throwError(() => err))
    );
  }

  refreshToken(): Observable<ApiResponse<TokenResponse>> {
    const refreshToken = this.userSignal()?.refreshToken;
    if (!refreshToken) return throwError(() => new Error('No refresh token'));
    return this.http.post<ApiResponse<TokenResponse>>(`${this.api}/auth/refresh`, { refreshToken }).pipe(
      tap(res => this.handleAuthSuccess(res.data))
    );
  }

  logout(): void {
    const refreshToken = this.userSignal()?.refreshToken;
    if (refreshToken) {
      this.http.post(`${this.api}/auth/logout`, { refreshToken }).subscribe({ error: () => {} });
    }
    this.clearSession();
    this.router.navigate(['/portal/convocatorias']);
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(r => this.hasRole(r));
  }

  getAccessToken(): string | null {
    return this.userSignal()?.accessToken ?? null;
  }

  redirectByRole(): void {
    if (this.isPostulante()) {
      this.router.navigate(['/portal/dashboard']);
    } else if (this.isInternal()) {
      this.router.navigate(['/sistema/dashboard']);
    }
  }

  private handleAuthSuccess(token: TokenResponse): void {
    const session: UserSession = {
      username: token.username,
      nombreCompleto: token.nombreCompleto,
      roles: token.roles,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
    };
    this.userSignal.set(session);
    try { sessionStorage.setItem(environment.userKey, JSON.stringify(session)); } catch {}
  }

  private clearSession(): void {
    this.userSignal.set(null);
    try { sessionStorage.removeItem(environment.userKey); } catch {}
  }

  private loadSession(): UserSession | null {
    try {
      const raw = sessionStorage.getItem(environment.userKey);
      return raw ? JSON.parse(raw) as UserSession : null;
    } catch { return null; }
  }
}
