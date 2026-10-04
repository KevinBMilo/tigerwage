import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ApplicationService,
  ApplicationStatus,
  JobApplication,
} from '../../services/application';

@Component({
  selector: 'app-application-list',
  imports: [DatePipe, TitleCasePipe],
  templateUrl: './application-list.html',
})
export class ApplicationList implements OnInit {
  private service = inject(ApplicationService);

  applications = toSignal(this.service.applications$, { initialValue: [] });
  statuses: ApplicationStatus[] = ['applied', 'interviewing', 'offer', 'rejected'];
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.service.loadApplications().subscribe();
  }

  changeStatus(app: JobApplication, select: HTMLSelectElement) {
    this.errorMessage.set(null);
    const newStatus = select.value as ApplicationStatus;

    this.service.updateApplication(app.id, { status: newStatus }).subscribe({
      error: () => {
        select.value = app.status; // put the dropdown back
        this.errorMessage.set(`Could not update ${app.company}. Please try again.`);
      },
    });
  }

  remove(app: JobApplication) {
    if (!confirm(`Delete your application to ${app.company}?`)) {
      return;
    }

    this.errorMessage.set(null);
    this.service.deleteApplication(app.id).subscribe({
      error: () => this.errorMessage.set(`Could not delete ${app.company}. Please try again.`),
    });
  }
}