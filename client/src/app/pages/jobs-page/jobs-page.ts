import { Component } from '@angular/core';
import { JobBoard } from '../../components/job-board/job-board';

@Component({
  selector: 'app-jobs-page',
  imports: [JobBoard],
  templateUrl: './jobs-page.html',
})
export class JobsPage {}