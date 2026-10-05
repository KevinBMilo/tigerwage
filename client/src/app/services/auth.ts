import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay } from 'rxjs';
import { ApplicationService } from './application';

export interface User {
  id: number;
  email: string;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

const AUTH_URL = 'http://localhost:3000/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private applications = inject(ApplicationService);

  private accessToken: string | null = null;
  private refreshInFlight$: Observable<string | null> | null = null;

  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);

  getAccessToken(): string | null {
    return this.accessToken;
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<AuthResponse>(`${AUTH_URL}/login`, { email, password }, { withCredentials: true })
      .pipe(map(res => this.setSession(res)));
  }

  register(email: string, password: string): Observable<User> {
    return this.http
      .post<AuthResponse>(`${AUTH_URL}/register`, { email, password }, { withCredentials: true })
      .pipe(map(res => this.setSession(res)));
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

  // Used by the route guards: are we logged in, or can we quietly become logged in?
  ensureSession(): Observable<boolean> {
    if (this.accessToken) {
      return of(true);
    }
    return this.refresh().pipe(map(token => token !== null));
  }

  logout(): void {
    this.http
      .post(`${AUTH_URL}/logout`, {}, { withCredentials: true })
      .subscribe({ error: () => {} });
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private setSession(res: AuthResponse): User {
    this.accessToken = res.accessToken;
    this.user.set(res.user);
    return res.user;
  }

  private clearSession(): void {
    this.accessToken = null;
    this.user.set(null);
    this.applications.clear();
  }
}