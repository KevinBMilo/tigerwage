import { Component, OnInit, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ApplicationService } from '../../services/application';

@Component({
  selector: 'app-application-list',
  imports: [DatePipe, TitleCasePipe],
  templateUrl: './application-list.html',
})
export class ApplicationList implements OnInit {
  private service = inject(ApplicationService);

  applications = toSignal(this.service.applications$, { initialValue: [] });

  ngOnInit() {
    this.service.loadApplications().subscribe();
  }
}