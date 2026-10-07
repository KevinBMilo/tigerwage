import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Resume, ResumeService } from '../../services/resume';
import { formatFileSize } from '../../format';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-resume-library',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './resume-library.html',
})
export class ResumeLibrary implements OnInit {
  private resumeService = inject(ResumeService);
  private fb = inject(FormBuilder);

  readonly maxResumes = 3;
  readonly accept = '.pdf,.doc,.docx,.txt';
  readonly formatFileSize = formatFileSize;

  resumes = toSignal(this.resumeService.resumes$, { initialValue: [] });
  canAddMore = computed(() => this.resumes().length < this.maxResumes);

  selectedFile = signal<File | null>(null);
  uploading = signal(false);
  errorMessage = signal<string | null>(null);
  renamingId = signal<number | null>(null);

  addForm = this.fb.nonNullable.group({
    nickname: ['', [Validators.required, Validators.maxLength(50)]],
  });
  renameControl = this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(50)]);

  ngOnInit() {
    this.resumeService.load().subscribe({
      error: () => this.errorMessage.set('Could not load your résumés.'),
    });
  }

  onFileSelected(fileInput: HTMLInputElement) {
    const file = fileInput.files?.[0] ?? null;
    this.errorMessage.set(null);

    if (file && file.size > MAX_FILE_BYTES) {
      this.errorMessage.set('Files must be 5 MB or smaller.');
      fileInput.value = '';
      this.selectedFile.set(null);
      return;
    }
    this.selectedFile.set(file);
  }

  upload(fileInput: HTMLInputElement) {
    const file = this.selectedFile();
    if (this.addForm.invalid || !file) {
      this.addForm.markAllAsTouched();
      if (!file) {
        this.errorMessage.set('Choose a file to upload.');
      }
      return;
    }

    this.uploading.set(true);
    this.errorMessage.set(null);

    this.resumeService.upload(file, this.addForm.controls.nickname.value.trim()).subscribe({
      next: () => {
        this.addForm.reset();
        this.selectedFile.set(null);
        fileInput.value = '';
        this.uploading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.error ?? 'Upload failed. Please try again.');
        this.uploading.set(false);
      },
    });
  }

  startRename(resume: Resume) {
    this.errorMessage.set(null);
    this.renameControl.setValue(resume.nickname);
    this.renamingId.set(resume.id);
  }

  cancelRename() {
    this.renamingId.set(null);
  }

  saveRename(resume: Resume) {
    if (this.renameControl.invalid) {
      this.renameControl.markAsTouched();
      return;
    }

    this.resumeService.rename(resume.id, this.renameControl.value.trim()).subscribe({
      next: () => this.renamingId.set(null),
      error: (err: HttpErrorResponse) =>
        this.errorMessage.set(err.error?.error ?? 'Could not rename that résumé.'),
    });
  }

  makeDefault(resume: Resume) {
    this.errorMessage.set(null);
    this.resumeService.setDefault(resume.id).subscribe({
      error: () => this.errorMessage.set('Could not change the default résumé.'),
    });
  }

  download(resume: Resume) {
    this.resumeService.getDownloadUrl(resume.id).subscribe({
      next: url => (window.location.href = url),
      error: () => this.errorMessage.set('Could not download that résumé.'),
    });
  }

  remove(resume: Resume) {
    if (!confirm(`Delete your "${resume.nickname}" résumé?`)) {
      return;
    }

    this.errorMessage.set(null);
    this.resumeService.delete(resume.id).subscribe({
      error: () => this.errorMessage.set('Could not delete that résumé.'),
    });
  }
}