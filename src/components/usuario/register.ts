import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegistroUsuario {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly errorMessage = signal('');

  // [BUSCAR: FORMULARIO] Formulario reactivo para crear cuenta con validaciones basicas de seguridad.
  readonly form = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    correo: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  // [BUSCAR: AUTENTICACION USUARIO API] Registra al usuario y lo manda al login cuando el backend confirma el alta.
  register() {
    if (this.form.invalid) {
      this.errorMessage.set('Verifica que todos los campos esten correctamente llenados.');
      return;
    }

    this.errorMessage.set('');

    this.authService.register(this.form.value as { nombre: string; correo: string; password: string }).subscribe({
      next: () => this.router.navigate(['/usuario/login']),
      error: (error) => {
        this.errorMessage.set(error.error?.error || 'Error al registrar el usuario');
      }
    });
  }
}
