import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../environments/environment';

export interface UserProfile {
  id: number;
  nombre: string;
  correo: string;
}

export interface UserHistoryItem {
  action: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/user`;
  readonly token = signal(this.readToken());

  isAuthenticated(): boolean {
    return this.token() !== '';
  }

  login(credentials: { correo: string; password: string }): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        this.writeToken(response.token);
        this.token.set(response.token);
      })
    );
  }

  register(payload: { nombre: string; correo: string; password: string }) {
    return this.http.post(`${this.apiUrl}/register`, payload);
  }

  logout() {
    localStorage.removeItem('auth_token');
    this.token.set('');
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`, { headers: this.authHeaders() });
  }

  updateProfile(payload: Partial<{ nombre: string; correo: string; password: string }>) {
    return this.http.put<UserProfile>(`${this.apiUrl}/profile`, payload, { headers: this.authHeaders() });
  }

  getHistory(): Observable<UserHistoryItem[]> {
    return this.http.get<UserHistoryItem[]>(`${this.apiUrl}/history`, { headers: this.authHeaders() });
  }

  private authHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.token()}` });
  }

  private readToken(): string {
    return localStorage.getItem('auth_token') ?? '';
  }

  private writeToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }
}
