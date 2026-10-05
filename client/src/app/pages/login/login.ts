import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  registered = signal(false);
  mode = signal<'login' | 'register'>('login');
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);
  needsVerification = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    hp_field: [''],
  });

  toggleMode() {
    this.mode.update(m => (m === 'login' ? 'register' : 'login'));
    this.form.controls.password.reset();
    this.resetMessages();
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.resetMessages();
    const { email, password, hp_field } = this.form.getRawValue();

    if (this.mode() === 'register') {
  this.auth.register(email, password, hp_field).subscribe({
    next: res => {
      this.infoMessage.set(res.message);
      this.registered.set(true);
      this.mode.set('login');
      this.form.controls.password.reset();
      this.submitting.set(false);
    },
    error: (err: HttpErrorResponse) => this.handleError(err),
  });
} else {
      this.auth.login(email, password, hp_field).subscribe({
        next: () => this.router.navigate(['/']),
        error: (err: HttpErrorResponse) => this.handleError(err),
      });
    }
  }

  resendVerification() {
    const email = this.form.controls.email.value;
    this.auth.resendVerification(email).subscribe({
      next: res => {
        this.needsVerification.set(false);
        this.errorMessage.set(null);
        this.infoMessage.set(res.message);
      },
      error: (err: HttpErrorResponse) =>
        this.errorMessage.set(err.error?.error ?? 'Could not resend the email. Please try again.'),
    });
  }

  private handleError(err: HttpErrorResponse) {
    this.errorMessage.set(err.error?.error ?? 'Something went wrong. Please try again.');
    this.needsVerification.set(err.error?.code === 'EMAIL_NOT_VERIFIED');
    this.form.controls.password.reset();
    this.submitting.set(false);
  }

  private resetMessages() {
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.needsVerification.set(false);
  }

  backToLogin() {
    this.registered.set(false);
    this.resetMessages();
  }
}