import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApplicationService, ApplicationStatus } from '../../services/application';

@Component({
  selector: 'app-application-form',
  imports: [ReactiveFormsModule],
  templateUrl: './application-form.html',
})
export class ApplicationForm {
  private fb = inject(FormBuilder);
  private service = inject(ApplicationService);

  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    company: ['', [Validators.required, Validators.maxLength(255)]],
    position: ['', [Validators.required, Validators.maxLength(255)]],
    status: ['applied' as ApplicationStatus],
    applied_date: [''],
    notes: [''],
  });

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const value = this.form.getRawValue();

    this.service
      .addApplication({
        ...value,
        applied_date: value.applied_date || null,
        notes: value.notes || null,
      })
      .subscribe({
        next: () => {
          this.form.reset();
          this.submitting.set(false);
        },
        error: () => {
          this.errorMessage.set('Could not save the application. Please try again.');
          this.submitting.set(false);
        },
      });
  }
}