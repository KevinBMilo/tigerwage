import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService, AdminUser } from '../../services/admin';

type Filter = 'all' | 'confirmed' | 'unconfirmed';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers implements OnInit {
  private adminService = inject(AdminService);

  users = signal<AdminUser[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  filter = signal<Filter>('all');

  confirmedCount = computed(() => this.users().filter(u => u.email_verified_at).length);
  unconfirmedCount = computed(() => this.users().length - this.confirmedCount());

  visibleUsers = computed(() => {
    const users = this.users();
    switch (this.filter()) {
      case 'confirmed':
        return users.filter(u => u.email_verified_at);
      case 'unconfirmed':
        return users.filter(u => !u.email_verified_at);
      default:
        return users;
    }
  });

  ngOnInit() {
    this.adminService.listUsers().subscribe({
      next: users => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load users.');
        this.loading.set(false);
      },
    });
  }

  fullName(user: AdminUser): string {
    return [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
  }
}