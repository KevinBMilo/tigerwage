import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_NAME } from '../../app-info';

@Component({
  selector: 'app-privacy',
  imports: [RouterLink],
  templateUrl: './privacy.html',
})
export class PrivacyPage {
  readonly appName = APP_NAME;
  readonly contactEmail = 'privacy@tigerwage.com';
  readonly lastUpdated = 'October 8, 2026';
}