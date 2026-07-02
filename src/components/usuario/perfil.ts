import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class PerfilUsuario {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly profile = signal<UserProfile | null>(null);

  // [BUSCAR: AUTENTICACION USUARIO FORMULARIO] Formulario de edicion del perfil; la contrasena es opcional para no forzar cambios.
  readonly form = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    correo: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('')
  });

  constructor() {
    // [BUSCAR: USUARIO ANGULAR] Carga el perfil real apenas se crea el componente.
    this.loadProfile();
  }

  // [BUSCAR: USUARIO API INTERFAZ] Trae el perfil desde el backend y sincroniza la UI con los datos actuales.
  private loadProfile() {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.form.patchValue({ nombre: profile.nombre, correo: profile.correo });
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el perfil. Inicia sesion de nuevo.');
      }
    });
  }

  // [BUSCAR: USUARIO API] Envía los cambios del usuario al backend y actualiza mensajes de estado.
  save() {
    if (this.form.invalid) {
      this.errorMessage.set('Completa nombre y correo con datos validos.');
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    const payload = {
      nombre: this.form.controls.nombre.value ?? '',
      correo: this.form.controls.correo.value ?? '',
      password: this.form.controls.password.value || undefined
    };

    this.authService.updateProfile(payload).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.successMessage.set('Perfil actualizado correctamente.');
        this.form.controls.password.reset();
      },
      error: (error) => {
        this.errorMessage.set(error.error?.error || 'Error al actualizar el perfil.');
      }
    });
  }

  // [BUSCAR: AUTENTICACION INTERFAZ] Cierra la sesion local y vuelve a la pantalla de login.
  logout() {
    this.authService.logout();
    this.router.navigate(['/usuario/login']);
  }
}
