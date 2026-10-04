import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface JobApplication {
  id: number;
  company: string;
  position: string;
  status: string;
}

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
}