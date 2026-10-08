import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Resume {
  id: number;
  nickname: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  is_default: boolean;
  uploaded_at: string;
}

@Injectable({ providedIn: 'root' })
export class ResumeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/resumes`;

  private resumesSubject = new BehaviorSubject<Resume[]>([]);
  resumes$ = this.resumesSubject.asObservable();

  load(): Observable<Resume[]> {
    return this.http.get<Resume[]>(this.apiUrl).pipe(
      tap(resumes => this.resumesSubject.next(resumes))
    );
  }

  upload(file: File, nickname: string): Observable<Resume[]> {
    return this.http
      .post<{ uploadUrl: string; key: string }>(`${this.apiUrl}/upload-url`, {
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        nickname,
      })
      .pipe(
        switchMap(({ uploadUrl, key }) =>
          this.http
            .put(uploadUrl, file, { headers: { 'Content-Type': file.type }, responseType: 'text' })
            .pipe(map(() => key))
        ),
        switchMap(key =>
          this.http.post<Resume>(this.apiUrl, { key, fileName: file.name, nickname })
        ),
        switchMap(() => this.load())
      );
  }

  rename(id: number, nickname: string): Observable<Resume> {
    return this.http.patch<Resume>(`${this.apiUrl}/${id}`, { nickname }).pipe(
      tap(updated =>
        this.resumesSubject.next(
          this.resumesSubject.value.map(r => (r.id === updated.id ? updated : r))
        )
      )
    );
  }

  setDefault(id: number): Observable<Resume[]> {
    return this.http
      .patch<Resume>(`${this.apiUrl}/${id}`, { is_default: true })
      .pipe(switchMap(() => this.load()));
  }

  delete(id: number): Observable<Resume[]> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(switchMap(() => this.load()));
  }

  getDownloadUrl(id: number): Observable<string> {
    return this.http
      .get<{ url: string }>(`${this.apiUrl}/${id}/download-url`)
      .pipe(map(res => res.url));
  }

  clear() {
    this.resumesSubject.next([]);
  }
}