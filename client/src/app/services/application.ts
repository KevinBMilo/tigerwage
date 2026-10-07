import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export type ApplicationStatus = 'applied' | 'interviewing' | 'offer' | 'rejected';

export interface JobApplication {
  id: number;
  company: string;
  position: string;
  status: ApplicationStatus;
  applied_date: string | null;
  interview_date: string | null;
  follow_up_date: string | null;
  notes: string | null;
  resume_id: number | null;
  resume_nickname: string | null;
}

export type NewApplication = Omit<JobApplication, 'id' | 'resume_nickname'>;

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/applications';

  private applicationsSubject = new BehaviorSubject<JobApplication[]>([]);
  applications$ = this.applicationsSubject.asObservable();

  loadApplications(): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(this.apiUrl).pipe(
      tap(apps => this.applicationsSubject.next(apps))
    );
  }

  addApplication(application: NewApplication): Observable<JobApplication> {
    return this.http.post<JobApplication>(this.apiUrl, application).pipe(
      tap(created =>
        this.applicationsSubject.next([created, ...this.applicationsSubject.value])
      )
    );
  }

  updateApplication(id: number, changes: Partial<NewApplication>): Observable<JobApplication> {
    return this.http.patch<JobApplication>(`${this.apiUrl}/${id}`, changes).pipe(
      tap(updated =>
        this.applicationsSubject.next(
          this.applicationsSubject.value.map(app => (app.id === updated.id ? updated : app))
        )
      )
    );
  }

  deleteApplication(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() =>
        this.applicationsSubject.next(
          this.applicationsSubject.value.filter(app => app.id !== id)
        )
      )
    );
  }

  clear() {
    this.applicationsSubject.next([]);
  }
}