import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './services/auth';
import { environment } from '../environments/environment';

const API_BASE = environment.apiUrl;
const AUTH_ENDPOINTS =
  /\/api\/auth\/(login|register|refresh|logout|verify-email|resend-verification|forgot-password|reset-password|check-reset-token)$/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only touch requests to our own API, and leave the auth endpoints alone
  if (!req.url.startsWith(API_BASE) || AUTH_ENDPOINTS.test(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getAccessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      // The access token expired: refresh once, then retry the original request
      return auth.refresh().pipe(
        switchMap(newToken => {
          if (!newToken) {
            router.navigate(['/login']);
            return throwError(() => error);
          }
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
        })
      );
    })
  );
};