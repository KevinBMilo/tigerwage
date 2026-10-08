import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApplicationService, JobApplication } from './application';
import { environment } from '../../environments/environment';

export type WorkMode = 'remote' | 'hybrid' | 'onsite';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';

export interface JobPosting {
  id: number;
  title: string;
  company: string;
  location: string;
  work_mode: WorkMode;
  employment_type: EmploymentType;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  skills: string[];
  posted_date: string;
}

@Injectable({ providedIn: 'root' })
export class JobService {
  private http = inject(HttpClient);
  private applications = inject(ApplicationService);
  private apiUrl = `${environment.apiUrl}/jobs`;

  list(): Observable<JobPosting[]> {
    return this.http.get<JobPosting[]>(this.apiUrl);
  }

  apply(jobId: number): Observable<JobApplication> {
    return this.http
      .post<JobApplication>(`${this.apiUrl}/${jobId}/apply`, {})
      .pipe(tap(created => this.applications.addToList(created)));
  }
}