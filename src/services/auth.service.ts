import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../environments/environment';

export type UserRole = 'admin' | 'cliente';

export interface UserProfile {
  id: number;
  nombre: string;
  correo: string;
  role?: UserRole;
}

export interface UserHistoryItem {
  action: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/user`;
  // [BUSCAR: AUTENTICACION ANGULAR INTERFAZ] Signal que refleja si existe token en memoria/localStorage; la UI reacciona a este estado.
  readonly token = signal(this.readToken());
  readonly role = computed<UserRole>(() => this.getRoleFromToken(this.token()));

  // [BUSCAR: AUTENTICACION USUARIO] Determina si el usuario tiene una sesion utilizable.
  isAuthenticated(): boolean {
    return this.token() !== '';
  }

  isAdmin(): boolean {
    return this.role() === 'admin';
  }

  // [BUSCAR: AUTENTICACION API RENDIMIENTO] Envía credenciales al backend y persiste el JWT recibido al autenticar.
  login(credentials: { correo: string; password: string }): Observable<{ token: string; role: UserRole }> {
    return this.http.post<{ token: string; role: UserRole }>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        this.writeToken(response.token);
        this.token.set(response.token);
      })
    );
  }

  // [BUSCAR: API] Crea una cuenta nueva en el backend.
  register(payload: { nombre: string; correo: string; password: string }) {
    return this.http.post(`${this.apiUrl}/register`, payload);
  }

  // [BUSCAR: AUTENTICACION] Limpia la sesion local y deja la app en estado no autenticado.
  logout() {
    localStorage.removeItem('auth_token');
    this.token.set('');
  }

  // [BUSCAR: AUTENTICACION USUARIO] Consulta el perfil del usuario autenticado usando el JWT almacenado.
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`, { headers: this.authHeaders() });
  }

  // [BUSCAR: CORREO AUTENTICACION USUARIO] Actualiza nombre, correo o contrasena del perfil autenticado.
  updateProfile(payload: Partial<{ nombre: string; correo: string; password: string }>) {
    return this.http.put<UserProfile>(`${this.apiUrl}/profile`, payload, { headers: this.authHeaders() });
  }

  // [BUSCAR: USUARIO] Recupera la bitacora de acciones del usuario.
  getHistory(): Observable<UserHistoryItem[]> {
    return this.http.get<UserHistoryItem[]>(`${this.apiUrl}/history`, { headers: this.authHeaders() });
  }

  // [BUSCAR: AUTENTICACION] Construye el header Authorization requerido por las rutas protegidas.
  private authHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.token()}` });
  }

  // [BUSCAR: AUTENTICACION] Lee el token desde almacenamiento local al recargar la pagina.
  private readToken(): string {
    return localStorage.getItem('auth_token') ?? '';
  }

  // [BUSCAR: AUTENTICACION RENDIMIENTO] Persiste el token para que la sesion sobreviva a recargas del navegador.
  private writeToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private getRoleFromToken(token: string): UserRole {
    if (!token) {
      return 'cliente';
    }

    try {
      const payloadPart = token.split('.')[1] ?? '';
      const normalizedPayload = payloadPart
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(payloadPart.length / 4) * 4, '=');
      const payload = JSON.parse(atob(normalizedPayload)) as { role?: string };
      return payload.role === 'admin' ? 'admin' : 'cliente';
    } catch {
      return 'cliente';
    }
  }
}
