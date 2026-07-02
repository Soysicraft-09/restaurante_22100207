import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserHistoryItem } from '../../services/auth.service';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial.html',
  styleUrl: './historial.css'
})
export class HistorialUsuario {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly history = signal<UserHistoryItem[]>([]);
  readonly errorMessage = signal('');

  constructor() {
    // [BUSCAR: USUARIO INTERFAZ] El historial se carga apenas entra a la vista para no requerir clic extra.
    this.loadHistory();
  }

  // [BUSCAR: AUTENTICACION USUARIO API] Consulta la bitacora del usuario autenticado desde el backend.
  private loadHistory() {
    this.authService.getHistory().subscribe({
      next: (items) => this.history.set(items),
      error: () => this.errorMessage.set('No se pudo cargar el historial. Inicia sesion de nuevo.')
    });
  }

  // [BUSCAR: AUTENTICACION] Cierra la sesion local y regresa al login.
  logout() {
    this.authService.logout();
    this.router.navigate(['/usuario/login']);
  }
}
