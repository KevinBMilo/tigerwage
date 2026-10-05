import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { Login } from './pages/login/login';
import { ApplicationsPage } from './pages/applications-page/applications-page';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: '', component: ApplicationsPage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];