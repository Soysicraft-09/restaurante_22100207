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
  // Signal que refleja si existe token en memoria/localStorage; la UI reacciona a este estado.
  readonly token = signal(this.readToken());

  // Determina si el usuario tiene una sesion utilizable.
  isAuthenticated(): boolean {
    return this.token() !== '';
  }

  // Envía credenciales al backend y persiste el JWT recibido al autenticar.
  login(credentials: { correo: string; password: string }): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        this.writeToken(response.token);
        this.token.set(response.token);
      })
    );
  }

  // Crea una cuenta nueva en el backend.
  register(payload: { nombre: string; correo: string; password: string }) {
    return this.http.post(`${this.apiUrl}/register`, payload);
  }

  // Limpia la sesion local y deja la app en estado no autenticado.
  logout() {
    localStorage.removeItem('auth_token');
    this.token.set('');
  }

  // Consulta el perfil del usuario autenticado usando el JWT almacenado.
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`, { headers: this.authHeaders() });
  }

  // Actualiza nombre, correo o contrasena del perfil autenticado.
  updateProfile(payload: Partial<{ nombre: string; correo: string; password: string }>) {
    return this.http.put<UserProfile>(`${this.apiUrl}/profile`, payload, { headers: this.authHeaders() });
  }

  // Recupera la bitacora de acciones del usuario.
  getHistory(): Observable<UserHistoryItem[]> {
    return this.http.get<UserHistoryItem[]>(`${this.apiUrl}/history`, { headers: this.authHeaders() });
  }

  // Construye el header Authorization requerido por las rutas protegidas.
  private authHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.token()}` });
  }

  // Lee el token desde almacenamiento local al recargar la pagina.
  private readToken(): string {
    return localStorage.getItem('auth_token') ?? '';
  }

  // Persiste el token para que la sesion sobreviva a recargas del navegador.
  private writeToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }
}
