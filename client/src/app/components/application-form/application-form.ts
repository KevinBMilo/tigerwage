import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ApplicationService,
  ApplicationStatus,
  JobApplication,
} from '../../services/application';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ResumeService } from '../../services/resume';

@Component({
  selector: 'app-application-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './application-form.html',
})
export class ApplicationForm implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ApplicationService);
  private resumeService = inject(ResumeService);
  resumes = toSignal(this.resumeService.resumes$, { initialValue: [] });

  // Inputs and outputs
  application = input<JobApplication | null>(null);
  done = output<void>();

  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    company: ['', [Validators.required, Validators.maxLength(255)]],
    position: ['', [Validators.required, Validators.maxLength(255)]],
    status: ['applied' as ApplicationStatus],
    applied_date: [''],
    interview_date: [''],
    follow_up_date: [''],
    resume_id: [null as number | null],
    notes: [''],
  });

  get isEditing(): boolean {
    return this.application() !== null;
  }

  ngOnInit() {
  const app = this.application();

  this.resumeService.load().subscribe(() => {
    if (!app) {
      this.selectDefaultResume();
    }

    });

  if (app) {
    this.form.setValue({
      company: app.company,
      position: app.position,
      status: app.status,
      applied_date: app.applied_date ?? '',
      interview_date: app.interview_date ?? '',
      follow_up_date: app.follow_up_date ?? '',
      resume_id: app.resume_id,
      notes: app.notes ?? '',
    });
  }
}

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const value = this.form.getRawValue();
    const payload = {
      ...value,
      applied_date: value.applied_date || null,
      interview_date: value.interview_date || null,
      follow_up_date: value.follow_up_date || null,
      notes: value.notes || null,
    };

    const app = this.application();
    const request$ = app
      ? this.service.updateApplication(app.id, payload)
      : this.service.addApplication(payload);

    request$.subscribe({
      next: () => {
        if (!app) {
          this.form.reset();
          this.selectDefaultResume();
        }
        this.submitting.set(false);
        this.done.emit();
      },
      error: () => {
        this.errorMessage.set('Could not save the application. Please try again.');
        this.submitting.set(false);
      },
    });
  }

  private selectDefaultResume() {
    const defaultResume = this.resumes().find(r => r.is_default);
    this.form.controls.resume_id.setValue(defaultResume?.id ?? null);
  }

  clear() {
    this.form.reset();
    this.selectDefaultResume();
    this.errorMessage.set(null);
  }

  cancel() {
    this.done.emit();
  }
}