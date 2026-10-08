import { Component, signal } from '@angular/core';

const STORAGE_KEY = 'site-notice-dismissed';

@Component({
  selector: 'app-site-notice',
  templateUrl: './site-notice.html',
})
export class SiteNotice {
  visible = signal(!this.wasDismissed());

  dismiss() {
    this.visible.set(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Storage unavailable (private mode, blocked): just hide it for this visit
    }
  }

  private wasDismissed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}