import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Profile, ProfileService } from '../../services/profile';
import { passwordsMatch } from '../../validators';
import { ResumeLibrary } from '../../components/resume-library/resume-library';
import { switchMap, EMPTY } from 'rxjs';

const URL_PATTERN = /^https?:\/\/\S+$/i;
const PHONE_PATTERN = /^[0-9+()\-.\s]*$/;

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, DatePipe, ResumeLibrary],
  templateUrl: './profile.html',
})
export class ProfilePage implements OnInit {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);

  profile = signal<Profile | null>(null);
  loadError = signal<string | null>(null);

  savingDetails = signal(false);
  detailsMessage = signal<string | null>(null);
  detailsError = signal<string | null>(null);

  savingPassword = signal(false);
  passwordMessage = signal<string | null>(null);
  passwordError = signal<string | null>(null);

  deletingAccount = signal(false);
  deleteError = signal<string | null>(null);

  deleteForm = this.fb.nonNullable.group({
    password: ['', Validators.required],
    understood: [false, Validators.requiredTrue],
  });

  detailsForm = this.fb.nonNullable.group({
    first_name: ['', Validators.maxLength(100)],
    last_name: ['', Validators.maxLength(100)],
    phone: ['', [Validators.maxLength(30), Validators.pattern(PHONE_PATTERN)]],
    location: ['', Validators.maxLength(150)],
    linkedin_url: ['', [Validators.maxLength(500), Validators.pattern(URL_PATTERN)]],
    portfolio_url: ['', [Validators.maxLength(500), Validators.pattern(URL_PATTERN)]],
  });

  passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch() }
  );

  ngOnInit() {
    this.profileService.get().subscribe({
      next: profile => this.showProfile(profile),
      error: () => this.loadError.set('Could not load your profile.'),
    });
  }

  saveDetails() {
    if (this.detailsForm.invalid) {
      this.detailsForm.markAllAsTouched();
      return;
    }

    this.savingDetails.set(true);
    this.detailsMessage.set(null);
    this.detailsError.set(null);

    this.profileService.update(this.detailsForm.getRawValue()).subscribe({
      next: profile => {
        this.showProfile(profile);
        this.detailsMessage.set('Profile saved.');
        this.savingDetails.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.detailsError.set(err.error?.error ?? 'Could not save your profile.');
        this.savingDetails.set(false);
      },
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.savingPassword.set(true);
    this.passwordMessage.set(null);
    this.passwordError.set(null);

    const { currentPassword, password } = this.passwordForm.getRawValue();
    this.auth.changePassword(currentPassword, password).subscribe({
      next: res => {
        this.passwordMessage.set(res.message);
        this.passwordForm.reset();
        this.savingPassword.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.passwordError.set(err.error?.error ?? 'Could not change your password.');
        this.passwordForm.controls.currentPassword.reset();
        this.savingPassword.set(false);
      },
    });
  }

  // Shows the profile and resets the form to match (which also marks it unchanged)
  private showProfile(profile: Profile) {
    this.profile.set(profile);
    this.detailsForm.reset({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      phone: profile.phone ?? '',
      location: profile.location ?? '',
      linkedin_url: profile.linkedin_url ?? '',
      portfolio_url: profile.portfolio_url ?? '',
    });
  }

  deleteAccount() {
    if (this.deleteForm.invalid) {
      this.deleteForm.markAllAsTouched();
      return;
    }

    const password = this.deleteForm.controls.password.value;
    this.deletingAccount.set(true);
    this.deleteError.set(null);

    this.auth
      .verifyPassword(password)
      .pipe(
        switchMap(() => {
          if (!confirm('Permanently delete your account and all of its data? This cannot be undone.')) {
            return EMPTY; // cancelled: stop here
          }
          return this.auth.deleteAccount(password);
        })
      )
      .subscribe({
        complete: () => this.deletingAccount.set(false),
        error: (err: HttpErrorResponse) => {
          this.deleteError.set(err.error?.error ?? 'Could not delete your account. Please try again.');
          this.deleteForm.controls.password.reset();
          this.deletingAccount.set(false);
        },
      });
  }
}