import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApplicationService } from '../../services/application';
import { EmploymentType, JobPosting, JobService, WorkMode } from '../../services/job';

const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
};

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

@Component({
  selector: 'app-job-board',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './job-board.html',
  styleUrl: './job-board.scss',
})
export class JobBoard implements OnInit {
  private jobService = inject(JobService);
  private applicationService = inject(ApplicationService);

  readonly workModeLabels = WORK_MODE_LABELS;
  readonly employmentTypeLabels = EMPLOYMENT_TYPE_LABELS;

  jobs = signal<JobPosting[]>([]);
  loadError = signal<string | null>(null);
  applyingIds = signal<Set<number>>(new Set());
  errorMessage = signal<string | null>(null);

  // Which postings have you applied to? Derived from your live application list,
  // so deleting an application brings its Apply button back immediately.
  private applications = toSignal(this.applicationService.applications$, { initialValue: [] });
  appliedJobIds = computed(
    () =>
      new Set(
        this.applications()
          .map(app => app.job_posting_id)
          .filter((id): id is number => id !== null)
      )
  );

  ngOnInit() {
    this.jobService.list().subscribe({
      next: jobs => this.jobs.set(jobs),
      error: () => this.loadError.set('Could not load job listings.'),
    });
  }

  isHourly(job: JobPosting): boolean {
    return job.employment_type === 'contract' || job.employment_type === 'internship';
  }

  apply(job: JobPosting) {
    this.errorMessage.set(null);
    this.applyingIds.update(ids => new Set(ids).add(job.id));

    this.jobService.apply(job.id).subscribe({
      next: () => this.finishApplying(job.id),
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          // Already applied (maybe in another tab): refresh the list so the card updates
          this.applicationService.loadApplications().subscribe();
        } else {
          this.errorMessage.set(err.error?.error ?? `Could not apply to ${job.company}.`);
        }
        this.finishApplying(job.id);
      },
    });
  }

  private finishApplying(jobId: number) {
    this.applyingIds.update(ids => {
      const next = new Set(ids);
      next.delete(jobId);
      return next;
    });
  }
}