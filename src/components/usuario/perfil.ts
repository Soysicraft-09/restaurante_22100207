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

  readonly form = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    correo: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('')
  });

  constructor() {
    this.loadProfile();
  }

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

  logout() {
    this.authService.logout();
    this.router.navigate(['/usuario/login']);
  }
}
