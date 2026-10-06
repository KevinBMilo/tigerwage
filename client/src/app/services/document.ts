import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';

export interface ApplicationDocument {
  id: number;
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private http = inject(HttpClient);

  private baseUrl(applicationId: number): string {
    return `http://localhost:3000/api/applications/${applicationId}/documents`;
  }

  list(applicationId: number): Observable<ApplicationDocument[]> {
    return this.http.get<ApplicationDocument[]>(this.baseUrl(applicationId));
  }

  upload(applicationId: number, file: File): Observable<ApplicationDocument> {
    return this.http
      // 1. Ask the API for an upload link
      .post<{ uploadUrl: string; key: string }>(`${this.baseUrl(applicationId)}/upload-url`, {
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      })
      .pipe(
        // 2. Upload straight to S3
        switchMap(({ uploadUrl, key }) =>
          this.http
            .put(uploadUrl, file, { headers: { 'Content-Type': file.type }, responseType: 'text' })
            .pipe(map(() => key))
        ),
        // 3. Tell the API it's done
        switchMap(key =>
          this.http.post<ApplicationDocument>(this.baseUrl(applicationId), {
            key,
            fileName: file.name,
          })
        )
      );
  }

  getDownloadUrl(applicationId: number, documentId: number): Observable<string> {
    return this.http
      .get<{ url: string }>(`${this.baseUrl(applicationId)}/${documentId}/download-url`)
      .pipe(map(res => res.url));
  }

  delete(applicationId: number, documentId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl(applicationId)}/${documentId}`);
  }
}