import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  submitting = signal(false);
  sent = signal(false);
  message = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth.forgotPassword(this.form.controls.email.value).subscribe({
      next: res => {
        this.message.set(res.message);
        this.sent.set(true);
        this.submitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.error ?? 'Something went wrong. Please try again.');
        this.submitting.set(false);
      },
    });
  }
}