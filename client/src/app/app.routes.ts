import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { Login } from './pages/login/login';
import { ApplicationsPage } from './pages/applications-page/applications-page';
import { VerifyEmail } from './pages/verify-email/verify-email';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'verify-email', component: VerifyEmail },
  { path: '', component: ApplicationsPage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];