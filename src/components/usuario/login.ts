import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginUsuario {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly errorMessage = signal('');

  // Formulario reactivo con validaciones minimas para correo y contrasena.
  readonly form = new FormGroup({
    correo: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  // Intenta iniciar sesion y redirige al perfil si el backend devuelve token.
  login() {
    if (this.form.invalid) {
      this.errorMessage.set('Completa todos los campos con datos validos.');
      return;
    }

    this.errorMessage.set('');

    this.authService.login(this.form.value as { correo: string; password: string }).subscribe({
      next: () => this.router.navigate(['/usuario/perfil']),
      error: (error) => {
        this.errorMessage.set(error.error?.error || 'Error al iniciar sesion');
      }
    });
  }
}
