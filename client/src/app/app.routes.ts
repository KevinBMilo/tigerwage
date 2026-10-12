import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './auth.guard';
import { Login } from './pages/login/login';
import { ApplicationsPage } from './pages/applications-page/applications-page';
import { VerifyEmail } from './pages/verify-email/verify-email';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { ProfilePage } from './pages/profile/profile';
import { JobsPage } from './pages/jobs-page/jobs-page';
import { PrivacyPage } from './pages/privacy/privacy';
import { AdminUsers } from './pages/admin-users/admin-users';

export const routes: Routes = [
  { path: '', component: JobsPage },
  { path: 'applications', component: ApplicationsPage, canActivate: [authGuard] },
  { path: 'profile', component: ProfilePage, canActivate: [authGuard] },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPassword, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPassword },
  { path: 'verify-email', component: VerifyEmail },
  { path: 'privacy', component: PrivacyPage },
  { path: 'admin/users', component: AdminUsers, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' },
];