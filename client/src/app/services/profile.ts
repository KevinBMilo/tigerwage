import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Profile {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  member_since: string;
}

export type ProfileUpdate = Partial<Omit<Profile, 'email' | 'member_since'>>;

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/profile`;

  get(): Observable<Profile> {
    return this.http.get<Profile>(this.apiUrl);
  }

  update(changes: ProfileUpdate): Observable<Profile> {
    return this.http.patch<Profile>(this.apiUrl, changes);
  }
}