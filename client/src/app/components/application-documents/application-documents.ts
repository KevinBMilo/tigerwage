import { Component, OnInit, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ApplicationDocument, DocumentService } from '../../services/document';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-application-documents',
  imports: [DatePipe],
  templateUrl: './application-documents.html',
})
export class ApplicationDocuments implements OnInit {
  private documentService = inject(DocumentService);

  applicationId = input.required<number>();

  documents = signal<ApplicationDocument[]>([]);
  uploading = signal(false);
  errorMessage = signal<string | null>(null);

  readonly accept = '.pdf,.doc,.docx,.txt';

  ngOnInit() {
    this.documentService.list(this.applicationId()).subscribe({
      next: docs => this.documents.set(docs),
      error: () => this.errorMessage.set('Could not load documents.'),
    });
  }

  onFileSelected(fileInput: HTMLInputElement) {
    const file = fileInput.files?.[0];
    fileInput.value = ''; // lets the same file be chosen again later
    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      this.errorMessage.set('Files must be 5 MB or smaller.');
      return;
    }

    this.uploading.set(true);
    this.errorMessage.set(null);

    this.documentService.upload(this.applicationId(), file).subscribe({
      next: doc => {
        this.documents.update(docs => [doc, ...docs]);
        this.uploading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.error ?? 'Upload failed. Please try again.');
        this.uploading.set(false);
      },
    });
  }

  download(doc: ApplicationDocument) {
    this.documentService.getDownloadUrl(this.applicationId(), doc.id).subscribe({
      next: url => (window.location.href = url),
      error: () => this.errorMessage.set('Could not download that file.'),
    });
  }

  remove(doc: ApplicationDocument) {
    if (!confirm(`Remove ${doc.file_name}?`)) {
      return;
    }

    this.documentService.delete(this.applicationId(), doc.id).subscribe({
      next: () => this.documents.update(docs => docs.filter(d => d.id !== doc.id)),
      error: () => this.errorMessage.set(`Could not remove ${doc.file_name}.`),
    });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}