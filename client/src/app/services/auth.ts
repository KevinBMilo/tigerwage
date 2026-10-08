import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { ApplicationService } from './application';
import { ResumeService } from './resume';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

const AUTH_URL = `${environment.apiUrl}/auth`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private applications = inject(ApplicationService);
  private resumes = inject(ResumeService);
  

  private accessToken: string | null = null;
  private refreshInFlight$: Observable<string | null> | null = null;
  private loggedOut = false;

  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);

  getAccessToken(): string | null {
    return this.accessToken;
  }

  login(email: string, password: string, hp_field = ''): Observable<User> {
    return this.http
      .post<AuthResponse>(`${AUTH_URL}/login`, { email, password, hp_field }, { withCredentials: true })
      .pipe(map(res => this.setSession(res)));
  }

  register(email: string, password: string, hp_field = ''): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${AUTH_URL}/register`,
      { email, password, hp_field },
      { withCredentials: true }
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${AUTH_URL}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${AUTH_URL}/reset-password`, { token, password });
  }

  verifyEmail(token: string): Observable<User> {
    return this.http
      .post<AuthResponse>(`${AUTH_URL}/verify-email`, { token }, { withCredentials: true })
      .pipe(map(res => this.setSession(res)));
  }

  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${AUTH_URL}/resend-verification`, { email });
  }

  

  // Returns a new access token, or null if the session has ended.
  // If several requests need a refresh at once, they all share a single call.
  refresh(): Observable<string | null> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<AuthResponse>(`${AUTH_URL}/refresh`, {}, { withCredentials: true })
        .pipe(
          map(res => {
            this.setSession(res);
            return res.accessToken;
          }),
          catchError(() => {
            this.clearSession();
            return of(null);
          }),
          finalize(() => (this.refreshInFlight$ = null)),
          shareReplay(1)
        );
    }
    return this.refreshInFlight$;
  }

  ensureSession(): Observable<boolean> {
    if (this.accessToken) {
      return of(true);
    }
    if (this.loggedOut) {
      return of(false); // the user just logged out; don't try to revive the session
    }
    return this.refresh().pipe(map(token => token !== null));
  }

  logout(): void {
    this.loggedOut = true;
    this.http
      .post(`${AUTH_URL}/logout`, {}, { withCredentials: true })
      .pipe(
        finalize(() => {
          this.clearSession();
          this.router.navigate(['/login']);
        })
      )
      .subscribe({ error: () => {} });
  }

  private setSession(res: AuthResponse): User {
    this.accessToken = res.accessToken;
    this.loggedOut = false;
    this.user.set(res.user);
    return res.user;
  }

  private clearSession(): void {
    this.accessToken = null;
    this.user.set(null);
    this.applications.clear();
    this.resumes.clear();
  }

  checkResetToken(token: string): Observable<boolean> {
    return this.http
      .post<{ valid: boolean }>(`${AUTH_URL}/check-reset-token`, { token })
      .pipe(map(res => res.valid));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${AUTH_URL}/change-password`,
      { currentPassword, newPassword },
      { withCredentials: true }
    );
  }

  verifyPassword(password: string): Observable<void> {
    return this.http.post<void>(`${AUTH_URL}/verify-password`, { password });
  }

  deleteAccount(password: string): Observable<void> {
    return this.http
      .post<void>(`${AUTH_URL}/delete-account`, { password }, { withCredentials: true })
      .pipe(
        tap(() => {
          this.loggedOut = true;
          this.clearSession();
          this.router.navigate(['/login'], { queryParams: { deleted: 1 } });
        })
      );
  }
}