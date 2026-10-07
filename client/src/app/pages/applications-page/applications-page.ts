import { Component } from '@angular/core';
import { ApplicationForm } from '../../components/application-form/application-form';
import { ApplicationList } from '../../components/application-list/application-list';
import { JobBoard } from '../../components/job-board/job-board';

@Component({
  selector: 'app-applications-page',
  imports: [ApplicationForm, ApplicationList, JobBoard],
  templateUrl: './applications-page.html',
})
export class ApplicationsPage {}