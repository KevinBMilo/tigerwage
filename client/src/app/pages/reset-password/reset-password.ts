import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { passwordsMatch } from '../../validators';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
})

export class ResetPassword implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  status = signal<'checking' | 'valid' | 'invalid' | 'done'>('checking');
  submitting = signal(false);
  message = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch() }
  );

  ngOnInit() {
    if (!this.token) {
      this.status.set('invalid');
      return;
    }

    this.auth.checkResetToken(this.token).subscribe({
      next: valid => this.status.set(valid ? 'valid' : 'invalid'),
      error: () => this.status.set('invalid'),
    });
  }

  onSubmit() {
    if (!this.token) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth.resetPassword(this.token, this.form.controls.password.value).subscribe({
      next: res => {
        this.message.set(res.message);
        this.status.set('done');
        this.submitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.error ?? 'Something went wrong. Please try again.');
        this.form.reset();
        this.submitting.set(false);
      },
    });
  }
}