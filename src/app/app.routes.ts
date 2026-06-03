import { Routes } from '@angular/router';
import { userGuard } from '../services/auth.guard';

// Rutas principales de la experiencia: catalogo, autenticacion y secciones protegidas.
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('../components/catalogo/catalogo').then((module) => module.Catalogo),
  },
  { path: 'usuario', pathMatch: 'full', redirectTo: 'usuario/login' },
  {
    path: 'usuario/login',
    loadComponent: () => import('../components/usuario/login').then((module) => module.LoginUsuario),
  },
  {
    path: 'usuario/register',
    loadComponent: () => import('../components/usuario/register').then((module) => module.RegistroUsuario),
  },
  {
    path: 'usuario/perfil',
    loadComponent: () => import('../components/usuario/perfil').then((module) => module.PerfilUsuario),
    canMatch: [userGuard],
  },
  {
    path: 'usuario/historial',
    loadComponent: () => import('../components/usuario/historial').then((module) => module.HistorialUsuario),
    canMatch: [userGuard],
  },
  { path: '**', redirectTo: '' },
];
