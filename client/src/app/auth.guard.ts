import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './services/auth';

// For pages that require login
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ensureSession().pipe(
    map(loggedIn => (loggedIn ? true : router.createUrlTree(['/login'])))
  );
};

// For the login page: logged-in users go straight to the app
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ensureSession().pipe(
    map(loggedIn => (loggedIn ? router.createUrlTree(['/']) : true))
  );
};