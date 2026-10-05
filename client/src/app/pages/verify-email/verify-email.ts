import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  templateUrl: './verify-email.html',
})
export class VerifyEmail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  errorMessage = signal<string | null>(null);

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.errorMessage.set('This link is missing its confirmation code.');
      return;
    }

    this.auth.verifyEmail(token).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        // An already-used link is fine if this browser is already logged in
        this.auth.ensureSession().subscribe(loggedIn => {
          if (loggedIn) {
            this.router.navigate(['/']);
          } else {
            this.errorMessage.set(
              err.error?.error ?? 'Could not confirm your email. Please try again.'
            );
          }
        });
      },
    });
  }
}