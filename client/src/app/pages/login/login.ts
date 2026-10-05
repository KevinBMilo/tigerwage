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

  mode = signal<'login' | 'register'>('login');
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    hp_field: ['']
  });

  toggleMode() {
    this.mode.update(m => (m === 'login' ? 'register' : 'login'));
    this.errorMessage.set(null);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { email, password, hp_field } = this.form.getRawValue();
    const request$ =
      this.mode() === 'login'
        ? this.auth.login(email, password, hp_field)
        : this.auth.register(email, password, hp_field);

    request$.subscribe({
      next: () => this.router.navigate(['/']),
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.error ?? 'Something went wrong. Please try again.');
        this.submitting.set(false);
      },
    });
  }
}